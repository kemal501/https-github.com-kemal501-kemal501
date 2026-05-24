package com.barcalive.app.ui.screens

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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import coil.compose.rememberAsyncImagePainter
import com.barcalive.app.ui.theme.DarkBackground
import com.barcalive.app.ui.theme.GoldTheme
import com.barcalive.app.ui.theme.SlateGrey
import com.barcalive.app.viewmodel.BarcaViewModel

@Composable
fun VoiceRoomScreen(navController: NavController, viewModel: BarcaViewModel = viewModel()) {
    val user by viewModel.currentUser.collectAsState()
    val messages = remember { mutableStateListOf("🔥 Welcome to Barca-live room", "🎤 User joined the room") }
    var messageText by remember { mutableStateOf("") }
    
    // Seat states (false = empty, true = active speaker)
    val seatStates = remember { mutableStateListOf(true, false, false, false, false, false, false, false, false) }

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
                                seatStates[index] = !seatStates[index]
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
                            messages.add("🗨️ User: $messageText")
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
                GiftButton("🌹 Rose (10)", cost = 10, giftName = "Rose", viewModel = viewModel)
                GiftButton("💎 Ring (500)", cost = 500, giftName = "Diamond Ring", viewModel = viewModel)
                GiftButton("🚀 Rocket (5k)", cost = 5000, giftName = "Rocket", viewModel = viewModel)
            }
        }
    }
}

@Composable
fun GiftButton(label: String, cost: Int, giftName: String, viewModel: BarcaViewModel) {
    Button(
        onClick = { viewModel.sendVirtualGift(giftName, cost, "BarcaLiveHost") },
        colors = ButtonDefaults.buttonColors(containerColor = SlateGrey, contentColor = GoldTheme),
        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp)
    ) {
        Text(text = label, style = MaterialTheme.typography.labelSmall)
    }
}
