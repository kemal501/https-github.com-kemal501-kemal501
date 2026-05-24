package com.barcalive.app.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavController
import com.barcalive.app.ui.theme.DarkBackground
import com.barcalive.app.ui.theme.GoldTheme
import kotlinx.coroutines.delay

@Composable
fun SplashScreen(navController: NavController) {
    LaunchedEffect(Unit) {
        delay(2000)
        navController.navigate("login") {
            popUpTo("splash") {
                inclusive = true
            }
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "BarcaLive",
            style = MaterialTheme.typography.headlineLarge,
            color = GoldTheme
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Live Social Hub & Voice Lounge",
            style = MaterialTheme.typography.bodyMedium,
            color = GoldTheme.copy(alpha = 0.7f)
        )
    }
}
