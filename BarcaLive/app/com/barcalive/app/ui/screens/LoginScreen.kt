package com.barcalive.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.barcalive.app.ui.theme.DarkBackground
import com.barcalive.app.ui.theme.GoldTheme
import com.barcalive.app.viewmodel.BarcaViewModel

@Composable
fun LoginScreen(navController: NavController, viewModel: BarcaViewModel = viewModel()) {
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val loginError by viewModel.loginError.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "Welcome to BarcaLive",
            style = MaterialTheme.typography.titleLarge,
            color = GoldTheme
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Sign in or auto-create account",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.6f)
        )
        
        Spacer(modifier = Modifier.height(32.dp))

        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            label = { Text("Username") },
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = GoldTheme,
                focusedLabelColor = GoldTheme
            )
        )

        Spacer(modifier = Modifier.height(16.dp))

        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            label = { Text("Password") },
            visualTransformation = PasswordVisualTransformation(),
            modifier = Modifier.fillMaxWidth(),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = GoldTheme,
                focusedLabelColor = GoldTheme
            )
        )

        loginError?.let {
            Spacer(modifier = Modifier.height(8.dp))
            Text(text = it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = {
                if (username.isNotEmpty() && password.isNotEmpty()) {
                    viewModel.loginLocally(username, password) { success ->
                        if (success) {
                            navController.navigate("home") {
                                popUpTo("login") { inclusive = true }
                            }
                        }
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = GoldTheme, contentColor = DarkBackground)
        ) {
            Text("Login / Join Offline")
        }

        Spacer(modifier = Modifier.height(20.dp))

        Text(
            text = "New user? Create an Account / Register",
            color = GoldTheme,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier
                .clickable {
                    navController.navigate("register")
                }
                .padding(8.dp)
        )
    }
}
