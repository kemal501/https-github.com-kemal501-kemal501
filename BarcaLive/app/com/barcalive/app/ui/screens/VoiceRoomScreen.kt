package com.barcalive.app.ui.screens

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.widget.Toast
import android.media.AudioManager
import android.media.ToneGenerator
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.rememberAsyncImagePainter
import com.barcalive.app.ui.theme.DarkBackground
import com.barcalive.app.ui.theme.GoldTheme
import com.barcalive.app.ui.theme.SlateGrey
import com.barcalive.app.viewmodel.BarcaViewModel
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestoreSettings
import kotlinx.coroutines.delay

@Composable
fun VoiceRoomScreen(navController: NavController, viewModel: BarcaViewModel = viewModel()) {
    val context = LocalContext.current
    val user by viewModel.currentUser.collectAsState()
    val firestore = remember { FirebaseFirestore.getInstance() }
    val roomId = "barca_live_main_room"

    // Configure Firestore Cache explicitly for maximum local buffering/sync support
    LaunchedEffect(Unit) {
        try {
            val settings = FirebaseFirestoreSettings.Builder()
                .setPersistenceEnabled(true)
                .build()
            firestore.firestoreSettings = settings
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    var hasEntered by remember { mutableStateOf(false) }
    val messages = remember { mutableStateListOf("🔥 Welcome to Barca-live room", "🎤 Loading from Firestore...") }
    var messageText by remember { mutableStateOf("") }
    
    // Seat states (false = empty, true = active speaker)
    val seatStates = remember { mutableStateListOf(true, false, false, false, false, false, false, false, false) }

    // Sound feedback manager
    val soundManager = remember { RoomSoundManager() }
    DisposableEffect(Unit) {
        onDispose {
            soundManager.release()
        }
    }

    // 1. Real-time Firestore synchronized message history listener
    DisposableEffect(roomId) {
        val messagesRef = firestore.collection("rooms")
            .document(roomId)
            .collection("messages")
            .orderBy("timestamp", Query.Direction.ASCENDING)

        val listener = messagesRef.addSnapshotListener { snapshot, error ->
            // Update messages list reactively when data changes (or locally cached writes occur)
            if (snapshot != null) {
                messages.clear()
                messages.add("🔥 Welcome to Barca-live room")
                
                // Show cache indicator if loading from local database cache directly
                val isFromCache = snapshot.metadata.isFromCache
                if (isFromCache) {
                    messages.add("💤 Offline Cache Mode active (syncing queued)")
                } else {
                    messages.add("🟢 Connected to Live Cloud Database")
                }

                for (doc in snapshot.documents) {
                    val sender = doc.getString("sender") ?: "Guest"
                    val text = doc.getString("text") ?: ""
                    messages.add("🗨️ $sender: $text")
                }
            }
        }

        onDispose {
            listener.remove()
        }
    }

    // 2. Real-time Room Activity Persistence: Track user session (Join/Leave) ONLY after full entry
    DisposableEffect(roomId, user, hasEntered) {
        if (!hasEntered) return@DisposableEffect onDispose {}
        val username = user?.username ?: "Guest"
        val userId = user?.id ?: 0

        try {
            val joinActivity = hashMapOf(
                "userId" to userId,
                "username" to username,
                "activity" to "Joined Lounge Room",
                "timestamp" to FieldValue.serverTimestamp()
            )
            firestore.collection("rooms")
                .document(roomId)
                .collection("activities")
                .add(joinActivity)
        } catch (e: Exception) {
            e.printStackTrace()
        }

        onDispose {
            try {
                val leaveActivity = hashMapOf(
                    "userId" to userId,
                    "username" to username,
                    "activity" to "Left Lounge Room",
                    "timestamp" to FieldValue.serverTimestamp()
                )
                firestore.collection("rooms")
                    .document(roomId)
                    .collection("activities")
                    .add(leaveActivity)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // Connectivity monitoring using System ConnectivityManager
    var isConnected by remember { mutableStateOf<Boolean?>(null) }
    var showNotification by remember { mutableStateOf(false) }
    var notificationMessage by remember { mutableStateOf("") }
    var notificationIsOnline by remember { mutableStateOf(true) }

    DisposableEffect(context) {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        // Initial check
        val activeNetwork = connectivityManager.activeNetwork
        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork)
        val initialConnected = capabilities?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true
        isConnected = initialConnected

        val networkCallback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                if (isConnected == false) {
                    isConnected = true
                    notificationMessage = "Back Online • Connection Restored"
                    notificationIsOnline = true
                    showNotification = true
                } else if (isConnected == null) {
                    isConnected = true
                }
            }

            override fun onLost(network: Network) {
                if (isConnected == true || isConnected == null) {
                    isConnected = false
                    notificationMessage = "Offline • Syncing paused"
                    notificationIsOnline = false
                    showNotification = true
                }
            }
        }

        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        
        connectivityManager.registerNetworkCallback(request, networkCallback)

        onDispose {
            connectivityManager.unregisterNetworkCallback(networkCallback)
        }
    }

    LaunchedEffect(showNotification) {
        if (showNotification) {
            Toast.makeText(context, notificationMessage, Toast.LENGTH_SHORT).show()
            delay(3500)
            showNotification = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Aesthetic Room Background Image
        Image(
            painter = rememberAsyncImagePainter("https://images.unsplash.com/photo-1516280440614-37939bbacd81"),
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.65f))
                .padding(16.dp)
        ) {
            // Room Header
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(
                        painter = rememberAsyncImagePainter("https://i.pravatar.cc/150?img=12"),
                        contentDescription = null,
                        modifier = Modifier.size(54.dp).clip(CircleShape)
                    )
                    Spacer(modifier = Modifier.size(12.dp))
                    Column {
                        Text(text = "Barca-live Host", color = Color.White, style = MaterialTheme.typography.titleMedium)
                        Text(text = "ID: 1086462", color = Color.LightGray, style = MaterialTheme.typography.bodySmall)
                    }
                }
                Text(text = "🔴 LIVE", color = Color.Red, style = MaterialTheme.typography.labelLarge)
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Wallets & Coin statistics
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                CoinChip(text = "🪙 Balance: ${user?.coins ?: 0}")
                CoinChip(text = "🔥 Multiplier: 2.5x")
            }

            Spacer(modifier = Modifier.height(20.dp))

            // 9 Seats Microphones Simulated Setup
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(9) { index ->
                    val isOccupied = seatStates[index]
                    Box(
                        modifier = Modifier
                            .size(80.dp)
                            .clip(CircleShape)
                            .background(if (isOccupied) GoldTheme else Color.White.copy(alpha = 0.15f))
                            .clickable {
                                val newVal = !seatStates[index]
                                seatStates[index] = newVal
                                try {
                                    val currentUserName = user?.username ?: "Guest"
                                    val interactionData = hashMapOf(
                                        "username" to currentUserName,
                                        "interactionType" to "Seat Microphone Toggle",
                                        "details" to "Seat $index changed to ${if (newVal) "ACTIVE" else "MUTED"}",
                                        "timestamp" to FieldValue.serverTimestamp()
                                    )
                                    firestore.collection("rooms")
                                        .document(roomId)
                                        .collection("interactions")
                                        .add(interactionData)
                                } catch (e: Exception) {
                                    e.printStackTrace()
                                }
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        if (index == 0) {
                            Image(
                                painter = rememberAsyncImagePainter("https://i.pravatar.cc/150?img=12"),
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize().clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        } else if (isOccupied) {
                            Image(
                                painter = rememberAsyncImagePainter("https://i.pravatar.cc/150?img=${index + 10}"),
                                contentDescription = null,
                                modifier = Modifier.fillMaxSize().clip(CircleShape),
                                contentScale = ContentScale.Crop
                            )
                        } else {
                            Text(text = "🎙️", color = Color.White)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Room Rules Banner
            Card(
                shape = RoundedCornerShape(12.dp),
                colors = CardDefaults.cardColors(containerColor = SlateGrey.copy(alpha = 0.85f)),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text("Lounge Rules:", style = MaterialTheme.typography.bodyMedium, color = GoldTheme)
                    Text("1. Respect everyone  |  2. Mute default if noisy", style = MaterialTheme.typography.bodySmall, color = Color.White)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Live messages feeds
            LazyVerticalGrid(
                columns = GridCells.Fixed(1),
                modifier = Modifier.height(100.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(messages.size) { index ->
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color.Black.copy(alpha = 0.4f)),
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(text = messages[index], modifier = Modifier.padding(8.dp), color = Color.White, style = MaterialTheme.typography.bodySmall)
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // Text input sending
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
            ) {
                OutlinedTextField(
                    value = messageText,
                    onValueChange = { messageText = it },
                    placeholder = { Text("Enter message...") },
                    modifier = Modifier.weight(1f),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GoldTheme,
                        unfocusedContainerColor = SlateGrey.copy(alpha = 0.5f),
                        focusedContainerColor = SlateGrey
                    )
                )

                Button(
                    onClick = {
                        if (messageText.isNotEmpty()) {
                            try {
                                val currentUserName = user?.username ?: "Guest"
                                val msgData = hashMapOf(
                                    "sender" to currentUserName,
                                    "text" to messageText,
                                    "timestamp" to FieldValue.serverTimestamp()
                                )
                                firestore.collection("rooms")
                                    .document(roomId)
                                    .collection("messages")
                                    .add(msgData)
                            } catch (e: Exception) {
                                e.printStackTrace()
                            }
                            soundManager.playSendMessage()
                            messageText = ""
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = GoldTheme, contentColor = Color.Black)
                ) {
                    Text("Send")
                }
            }

            // Quick Virtual Gift sending bar
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                GiftButton("🌹 Rose (10)", cost = 10, giftName = "Rose", viewModel = viewModel, soundManager = soundManager, firestore = firestore, roomId = roomId)
                GiftButton("💎 Ring (500)", cost = 500, giftName = "Diamond Ring", viewModel = viewModel, soundManager = soundManager, firestore = firestore, roomId = roomId)
                GiftButton("🚀 Rocket (5k)", cost = 5000, giftName = "Rocket", viewModel = viewModel, soundManager = soundManager, firestore = firestore, roomId = roomId)
            }
        }

        // Beautiful, Non-intrusive custom Toast notification banner at the top of the room
        AnimatedVisibility(
            visible = showNotification,
            enter = slideInVertically { -it } + fadeIn(),
            exit = slideOutVertically { -it } + fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 80.dp)
        ) {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(
                    containerColor = if (notificationIsOnline) Color(0xFF1B5E20).copy(alpha = 0.95f) else Color(0xFFC62828).copy(alpha = 0.95f)
                ),
                elevation = CardDefaults.cardElevation(defaultElevation = 6.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = if (notificationIsOnline) "🟢" else "🔴",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        text = notificationMessage,
                        color = Color.White,
                        style = MaterialTheme.typography.bodySmall
                    )
                }
            }
        }

        // Gorgeous UI Preview Mode Overlay Card
        if (!hasEntered) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.82f))
                    .clickable(enabled = true) { /* Consume clicks to prevent background interactions */ },
                contentAlignment = Alignment.Center
            ) {
                Card(
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = SlateGrey.copy(alpha = 0.96f)),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    elevation = CardDefaults.cardElevation(defaultElevation = 12.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Text(
                            text = "👀 Live Room Preview",
                            style = MaterialTheme.typography.titleLarge,
                            color = GoldTheme
                        )
                        
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(1.dp)
                                .background(Color.White.copy(alpha = 0.15f))
                        )

                        // Room details info snippet
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Image(
                                painter = rememberAsyncImagePainter("https://i.pravatar.cc/150?img=12"),
                                contentDescription = null,
                                modifier = Modifier
                                    .size(46.dp)
                                    .clip(CircleShape)
                            )
                            Column {
                                Text("Lounge Room VIP", color = Color.White, style = MaterialTheme.typography.bodyLarge)
                                Text("Host: @BarcaLiveHost (Active 🔴)", color = Color.LightGray, style = MaterialTheme.typography.bodySmall)
                            }
                            Spacer(modifier = Modifier.weight(1f))
                            Text("👥 Live", color = Color.Green, style = MaterialTheme.typography.labelSmall)
                        }

                        // Sneak peek of room activity (chats) before fully committing
                        Card(
                            colors = CardDefaults.cardColors(containerColor = Color.Black.copy(alpha = 0.4f)),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    text = "💬 Live Room Activity Snippet:",
                                    color = GoldTheme,
                                    style = MaterialTheme.typography.labelSmall,
                                    modifier = Modifier.padding(bottom = 6.dp)
                                )
                                // Dynamically fetch and display the last 2 room activity notifications or chat messages
                                val previewMsgs = messages.takeLast(2)
                                if (previewMsgs.isEmpty()) {
                                    Text("Waiting for conversations...", color = Color.Gray, style = MaterialTheme.typography.bodySmall)
                                } else {
                                    previewMsgs.forEach { msg ->
                                        Text(
                                            text = msg,
                                            color = Color.White,
                                            style = MaterialTheme.typography.bodySmall,
                                            modifier = Modifier.padding(vertical = 2.dp)
                                        )
                                    }
                                }
                            }
                        }

                        Spacer(modifier = Modifier.height(4.dp))

                        // Controls
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Button(
                                onClick = { navController.popBackStack() },
                                colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = 0.12f)),
                                modifier = Modifier.weight(1f)
                            ) {
                                Text("Go Back", color = Color.White, style = MaterialTheme.typography.labelMedium)
                            }
                            
                            Button(
                                onClick = { 
                                    hasEntered = true
                                    soundManager.playSendGift() // Play pleasant entrance chime sound!
                                    Toast.makeText(context, "Welcome to Barca-live Room!", Toast.LENGTH_SHORT).show()
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = GoldTheme, contentColor = Color.Black),
                                modifier = Modifier.weight(1.5f)
                            ) {
                                Text("Join Live Room", style = MaterialTheme.typography.titleSmall)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun GiftButton(
    label: String,
    cost: Int,
    giftName: String,
    viewModel: BarcaViewModel,
    soundManager: RoomSoundManager,
    firestore: FirebaseFirestore,
    roomId: String
) {
    val user by viewModel.currentUser.collectAsState()
    Button(
        onClick = {
            val coins = user?.coins ?: 0
            if (coins >= cost) {
                viewModel.sendVirtualGift(giftName, cost, "BarcaLiveHost")
                soundManager.playSendGift()

                // Track user interaction with Firestore (online / offline cache queue)
                try {
                    val currentUserName = user?.username ?: "Guest"
                    val interactionData = hashMapOf(
                        "sender" to currentUserName,
                        "interactionType" to "Sent Virtual Gift",
                        "details" to "Sent $giftName costing $cost coins to @BarcaLiveHost",
                        "timestamp" to FieldValue.serverTimestamp()
                    )
                    firestore.collection("rooms")
                        .document(roomId)
                        .collection("interactions")
                        .add(interactionData)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            } else {
                soundManager.playError()
            }
        },
        colors = ButtonDefaults.buttonColors(containerColor = SlateGrey, contentColor = GoldTheme),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(text = label, style = MaterialTheme.typography.labelSmall)
    }
}

// Immutable utility wrapper class for system synthesizer tones
class RoomSoundManager {
    private var toneGenerator: ToneGenerator? = null

    init {
        try {
            toneGenerator = ToneGenerator(AudioManager.STREAM_MUSIC, 75)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun playSendMessage() {
        try {
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_BEEP, 70)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun playSendGift() {
        try {
            toneGenerator?.startTone(ToneGenerator.TONE_CDMA_CONFIRM, 150)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun playError() {
        try {
            toneGenerator?.startTone(ToneGenerator.TONE_PROP_NACK, 155)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun release() {
        try {
            toneGenerator?.release()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
