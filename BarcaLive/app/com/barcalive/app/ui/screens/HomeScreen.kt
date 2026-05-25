package com.barcalive.app.ui.screens

import android.widget.Toast
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.barcalive.app.ui.theme.DarkBackground
import com.barcalive.app.ui.theme.GoldTheme
import com.barcalive.app.ui.theme.SlateGrey
import com.barcalive.app.viewmodel.BarcaViewModel
import kotlinx.coroutines.delay

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(navController: NavController, viewModel: BarcaViewModel = viewModel()) {
    val context = LocalContext.current
    val user by viewModel.currentUser.collectAsState()
    val agentsCount by viewModel.agents.collectAsState()
    val hostsCount by viewModel.hosts.collectAsState()

    // Smooth Coin Counter Animation
    val animatedCoins by animateIntAsState(
        targetValue = user?.coins ?: 0,
        animationSpec = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
        label = "coinCountAnimation"
    )

    // Face Scanner Overlay State
    var showScanDialog by remember { mutableStateOf(false) }
    var scanStep by remember { mutableStateOf(0) } // 0: Init, 1: Scanning, 2: Completed

    // Scanner laser line animation
    val infiniteTransition = rememberInfiniteTransition(label = "laser")
    val laserYOffset by infiniteTransition.animateFloat(
        initialValue = -100f,
        targetValue = 100f,
        animationSpec = infiniteRepeatable(
            animation = tween(1800, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "laserY"
    )

    // Run the scanning process sequentially
    LaunchedEffect(showScanDialog) {
        if (showScanDialog) {
            scanStep = 1
            delay(1500)
            scanStep = 2
            delay(1500)
            scanStep = 3
            delay(1200)
            viewModel.performFaceVerification {
                Toast.makeText(context, "Face check approved! +20,000 Coins added.", Toast.LENGTH_LONG).show()
                scanStep = 0
                showScanDialog = false
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("BarcaLive Lounge", color = GoldTheme) },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = SlateGrey)
                )
            },
            containerColor = DarkBackground
        ) { paddingValues ->
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    user?.let {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SlateGrey)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(text = "Logged in as @${it.username}", style = MaterialTheme.typography.titleMedium, color = GoldTheme)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(text = "User Code: ${it.userCode}", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f))
                                Spacer(modifier = Modifier.height(8.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    // Smoothly animated rolling coin counter
                                    Text(text = "🪙 $animatedCoins Coins", style = MaterialTheme.typography.titleLarge, color = GoldTheme)
                                    
                                    if (it.kycVerified) {
                                        Surface(
                                            color = Color(0xFF2E7D32),
                                            contentColor = Color.White,
                                            shape = RoundedCornerShape(6.dp)
                                        ) {
                                            Text(
                                                text = "🛡️ KYC VERIFIED",
                                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                                style = MaterialTheme.typography.labelSmall,
                                                fontSize = 11.sp
                                            )
                                        }
                                    } else {
                                        Button(
                                            onClick = {
                                                showScanDialog = true
                                            },
                                            colors = ButtonDefaults.buttonColors(containerColor = GoldTheme.copy(alpha = 0.2f), contentColor = GoldTheme)
                                        ) {
                                            Text("CLAIM 20K COINS")
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(containerColor = SlateGrey)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(text = "Agents Recruited", style = MaterialTheme.typography.labelMedium)
                                Text(text = "${agentsCount.size}", style = MaterialTheme.typography.headlineMedium, color = GoldTheme)
                            }
                        }
                        Card(
                            modifier = Modifier.weight(1f),
                            colors = CardDefaults.cardColors(containerColor = SlateGrey)
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(text = "Registered Hosts", style = MaterialTheme.typography.labelMedium)
                                Text(text = "${hostsCount.size}", style = MaterialTheme.typography.headlineMedium, color = GoldTheme)
                            }
                        }
                    }
                }

                item {
                    DashboardCard(
                        title = "Interactive Voice Lounge",
                        description = "Join premium voice rooms, occupy micro seats, and share virtual gifts. Please verify KYC first to access high-tier premium lounges."
                    )
                }

                item {
                    Button(
                        onClick = { navController.navigate("rooms") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = GoldTheme, contentColor = DarkBackground)
                    ) {
                        Text("Open Live Voice Room")
                    }
                }

                item {
                    OutlinedButton(
                        onClick = { navController.navigate("settings") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = GoldTheme)
                    ) {
                        Text("App Settings & Utilities")
                    }
                }
            }
        }

        // Simulating Real-time Face Verification biometric scanner overlay dialog
        if (showScanDialog) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.94f))
                    .clickable { /* consume click to avoid click through */ },
                contentAlignment = Alignment.Center
            ) {
                Card(
                    shape = RoundedCornerShape(28.dp),
                    colors = CardDefaults.cardColors(containerColor = SlateGrey),
                    modifier = Modifier
                        .fillMaxWidth(0.88f)
                        .padding(16.dp),
                    border = BorderStroke(1.dp, GoldTheme.copy(alpha = 0.3f))
                ) {
                    Column(
                        modifier = Modifier.padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(20.dp)
                    ) {
                        Text(
                            text = "Face Verification Setup",
                            style = MaterialTheme.typography.titleMedium,
                            color = GoldTheme,
                            textAlign = TextAlign.Center
                        )

                        // Outer scanner circular camera viewport
                        Box(
                            modifier = Modifier
                                .size(180.dp)
                                .clip(CircleShape)
                                .background(Color.Black)
                                .border(2.dp, GoldTheme, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            // Selfie display placeholder
                            Text(
                                text = "👤",
                                fontSize = 68.sp,
                                modifier = Modifier.align(Alignment.Center)
                            )
                            
                            // Translating green scanner laser bar
                            if (scanStep == 1 || scanStep == 2) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(0.9f)
                                        .height(4.dp)
                                        .offset(y = laserYOffset.dp)
                                        .background(
                                            brush = Brush.horizontalGradient(
                                                colors = listOf(Color.Transparent, Color.Green, Color.Green, Color.Transparent)
                                            )
                                        )
                                )
                            }
                        }

                        // Scanning step captions
                        val statusText = when (scanStep) {
                            1 -> "Aligning face profile..."
                            2 -> "Detecting user focus & eye-blink..."
                            3 -> "Finalizing biometric signature mapping..."
                            else -> "Initializing face sensor..."
                        }

                        Text(
                            text = statusText,
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color.White,
                            textAlign = TextAlign.Center
                        )

                        CircularProgressIndicator(
                            color = GoldTheme,
                            modifier = Modifier.size(24.dp),
                            strokeWidth = 2.dp
                        )

                        Text(
                            text = "Hold still • BarcaLive secure vault security layer requires face verification before high-tier lounge entry.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.5f),
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(horizontal = 8.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun DashboardCard(title: String, description: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SlateGrey)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium, color = GoldTheme)
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.7f))
        }
    }
}
