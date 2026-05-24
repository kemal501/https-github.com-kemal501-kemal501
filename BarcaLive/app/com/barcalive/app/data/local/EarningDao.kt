package com.barcalive.app.data.local

import androidx.room.*
import com.barcalive.app.data.model.CoinTransaction
import kotlinx.coroutines.flow.Flow

@Dao
interface EarningDao {
    @Query("SELECT * FROM coin_transactions ORDER BY timestamp DESC")
    fun getAllTransactions(): Flow<List<CoinTransaction>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTransaction(transaction: CoinTransaction)

    @Query("SELECT SUM(amount) FROM coin_transactions WHERE type = 'GENERATED'")
    fun getSumOfGeneratedCoins(): Flow<Int?>
}
