package com.barcalive.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.barcalive.app.navigation.NavGraph
import com.barcalive.app.ui.theme.BarcaLiveTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BarcaLiveTheme {
                NavGraph()
            }
        }
    }
}
