package com.barcalive.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "coin_transactions")
data class CoinTransaction(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val userId: Int,
    val amount: Int,
    val type: String, // e.g., "GENERATED", "TRANSFER", "RECEIVED_GIFT", "SENT_GIFT", "RECHARGE"
    val paymentMethod: String? = null, // Visa, PayPal, Telebirr, Cryto
    val timestamp: Long
)
