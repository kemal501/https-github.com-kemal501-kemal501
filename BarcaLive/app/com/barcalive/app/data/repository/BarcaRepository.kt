package com.barcalive.app.data.repository

import com.barcalive.app.data.local.*
import com.barcalive.app.data.model.*
import kotlinx.coroutines.flow.Flow

class BarcaRepository(
    private val userDao: UserDao,
    private val agentDao: AgentDao,
    private val hostDao: HostDao,
    private val taskDao: TaskDao,
    private val earningDao: EarningDao
) {
    fun getAllAgents(): Flow<List<Agent>> = agentDao.getAllAgents()
    fun getAllHosts(): Flow<List<Host>> = hostDao.getAllHosts()
    fun getAllTasks(): Flow<List<DailyTask>> = taskDao.getAllTasks()
    fun getAllTransactions(): Flow<List<CoinTransaction>> = earningDao.getAllTransactions()
    fun getSumOfGeneratedCoins(): Flow<Int?> = earningDao.getSumOfGeneratedCoins()

    suspend fun insertUser(user: User): Long = userDao.insertUser(user)
    suspend fun getUserByUsername(username: String): User? = userDao.getUserByUsername(username)
    suspend fun getUserByCode(userCode: String): User? = userDao.getUserByCode(userCode)
    fun getUserById(userId: Int): Flow<User?> = userDao.getUserById(userId)
    suspend fun getUserByIdSuspended(userId: Int): User? = userDao.getUserByIdSuspended(userId)
    suspend fun updateUser(user: User) = userDao.updateUser(user)
    suspend fun addCoinsToUser(userId: Int, amount: Int) = userDao.addCoins(userId, amount)

    suspend fun insertAgent(agent: Agent) = agentDao.insertAgent(agent)
    suspend fun insertHost(host: Host) = hostDao.insertHost(host)
    suspend fun insertTask(task: DailyTask) = taskDao.insertTask(task)
    suspend fun updateTask(task: DailyTask) = taskDao.updateTask(task)
    suspend fun insertTransaction(transaction: CoinTransaction) = earningDao.insertTransaction(transaction)
}
