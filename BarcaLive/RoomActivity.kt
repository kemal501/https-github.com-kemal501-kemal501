package com.barcalive.app.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "room_activity")
data class RoomActivity(
    @PrimaryKey(autoGenerate = true)
    val id: Int = 0,
    val userId: Int,
    val roomId: String,
    val joinedAt: Long,
    val durationHours: Int = 0,
    val dateString: String // for daily tracking aggregates
)
