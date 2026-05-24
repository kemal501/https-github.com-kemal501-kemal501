package com.barcalive.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "agents")
data class Agent(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val agentCode: String,
    val name: String,
    val recruits: Int,
    val earnings: Double
)
