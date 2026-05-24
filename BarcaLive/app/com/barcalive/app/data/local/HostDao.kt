package com.barcalive.app.data.local

import androidx.room.*
import com.barcalive.app.data.model.Host
import kotlinx.coroutines.flow.Flow

@Dao
interface HostDao {
    @Query("SELECT * FROM hosts ORDER BY coinsEarned DESC")
    fun getAllHosts(): Flow<List<Host>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHost(host: Host)
}
