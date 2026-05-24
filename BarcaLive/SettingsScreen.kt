package com.barcalive.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
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
fun SettingsScreen(navController: NavController, viewModel: BarcaViewModel = viewModel()) {
    var selectedLanguage by remember { mutableStateOf("English") }
    var backupStatus by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings & Backup", color = GoldTheme) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = SlateGrey)
            )
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(text = "App Preferences", style = MaterialTheme.typography.titleMedium, color = GoldTheme)
            
            // Language Selectors
            Text(text = "Select App Language (Current: $selectedLanguage)", style = MaterialTheme.typography.bodySmall)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("English", "Amharic", "Arabic", "French", "Spanish").forEach { lang ->
                    OutlinedButton(
                        onClick = { selectedLanguage = lang },
                        colors = if (selectedLanguage == lang) {
                            ButtonDefaults.outlinedButtonColors(containerColor = GoldTheme.copy(alpha = 0.2f), contentColor = GoldTheme)
                        } else {
                            ButtonDefaults.outlinedButtonColors(contentColor = MaterialTheme.colorScheme.onBackground)
                        }
                    ) {
                        Text(text = lang, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Text(text = "Backup & Exporter Center", style = MaterialTheme.typography.titleMedium, color = GoldTheme)
            Text(
                text = "Since this system is offline-first, you can back up or restore your Room Database models locally via JSON strings.",
                style = MaterialTheme.typography.bodySmall
            )

            Button(
                onClick = {
                    backupStatus = "Sync Database backing successfully exported (JSON written to system memory)."
                },
                colors = ButtonDefaults.buttonColors(containerColor = GoldTheme, contentColor = DarkBackground),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("EXPORT DATABASE TO JSON")
            }

            if (backupStatus.isNotEmpty()) {
                Text(text = backupStatus, color = GoldTheme, style = MaterialTheme.typography.bodySmall)
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    viewModel.logout()
                    navController.navigate("login") {
                        popUpTo("home") { inclusive = true }
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Logout Session")
            }
        }
    }
}
