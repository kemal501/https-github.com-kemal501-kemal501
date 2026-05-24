package com.barcalive.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.barcalive.app.data.model.*

@Database(
    entities = [
        User::class,
        Agent::class,
        Host::class,
        DailyTask::class,
        CoinTransaction::class,
        RoomActivity::class,
        Gift::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    
    abstract fun userDao(): UserDao
    abstract fun agentDao(): AgentDao
    abstract fun hostDao(): HostDao
    abstract fun taskDao(): TaskDao
    abstract fun earningDao(): EarningDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "barcalive_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
