package com.barcalive.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class User(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val userCode: String,
    val username: String,
    val password: String,
    val coins: Int = 20000, // New users start with welcome reward
    val isVerified: Boolean = false
)
