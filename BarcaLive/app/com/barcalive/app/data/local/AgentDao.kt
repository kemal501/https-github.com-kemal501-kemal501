package com.barcalive.app.data.local

import androidx.room.*
import com.barcalive.app.data.model.Agent
import kotlinx.coroutines.flow.Flow

@Dao
interface AgentDao {
    @Query("SELECT * FROM agents ORDER BY recruits DESC")
    fun getAllAgents(): Flow<List<Agent>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAgent(agent: Agent)

    @Query("SELECT COUNT(*) FROM agents")
    suspend fun getAgentsCount(): Int
}
