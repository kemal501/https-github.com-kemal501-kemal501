package com.barcalive.app.navigation

import androidx.compose.runtime.Composable
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.barcalive.app.ui.screens.*
import com.barcalive.app.viewmodel.BarcaViewModel

@Composable
fun NavGraph(viewModel: BarcaViewModel = viewModel()) {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = "splash"
    ) {
        composable("splash") {
            SplashScreen(navController)
        }

        composable("login") {
            LoginScreen(navController, viewModel)
        }

        composable("register") {
            RegisterScreen(navController, viewModel)
        }

        composable("home") {
            HomeScreen(navController, viewModel)
        }

        composable("rooms") {
            VoiceRoomScreen(navController, viewModel)
        }

        composable("settings") {
            SettingsScreen(navController, viewModel)
        }
    }
}

