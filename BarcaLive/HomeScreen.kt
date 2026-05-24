package com.barcalive.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.barcalive.app.ui.theme.DarkBackground
import com.barcalive.app.ui.theme.GoldTheme
import com.barcalive.app.ui.theme.SlateGrey
import com.barcalive.app.viewmodel.BarcaViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(navController: NavController, viewModel: BarcaViewModel = viewModel()) {
    val user by viewModel.currentUser.collectAsState()
    val agentsCount by viewModel.agents.collectAsState()
    val hostsCount by viewModel.hosts.collectAsState()

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
                                Text(text = "🪙 ${it.coins} Coins", style = MaterialTheme.typography.titleLarge, color = GoldTheme)
                                if (it.isVerified) {
                                    Surface(
                                        color = GoldTheme,
                                        contentColor = DarkBackground,
                                        shape = MaterialTheme.shapes.small
                                    ) {
                                        Text(text = "KYC VERIFIED", modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp), style = MaterialTheme.typography.labelSmall)
                                    }
                                } else {
                                    Button(
                                        onClick = {
                                            viewModel.performFaceVerification {
                                                // Success verification!
                                            }
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
                    description = "Join premium voice rooms, occupy micro seats, and share virtual gifts."
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
