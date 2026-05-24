package com.barcalive.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "gifts")
data class Gift(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val senderId: Int,
    val receiverId: Int,
    val giftName: String,
    val coinValue: Int,
    val timestamp: Long
)
