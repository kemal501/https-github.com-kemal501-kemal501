package com.barcalive.app.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.barcalive.app.data.local.AppDatabase
import com.barcalive.app.data.model.*
import com.barcalive.app.data.repository.BarcaRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class BarcaViewModel(application: Application) : AndroidViewModel(application) {

    private val repository: BarcaRepository
    
    val agents: StateFlow<List<Agent>>
    val hosts: StateFlow<List<Host>>
    val tasks: StateFlow<List<DailyTask>>
    val transactions: StateFlow<List<CoinTransaction>>

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    private val _loginError = MutableStateFlow<String?>(null)
    val loginError: StateFlow<String?> = _loginError.asStateFlow()

    init {
        val database = AppDatabase.getDatabase(application)
        repository = BarcaRepository(
            userDao = database.userDao(),
            agentDao = database.agentDao(),
            hostDao = database.hostDao(),
            taskDao = database.taskDao(),
            earningDao = database.earningDao()
        )

        agents = repository.getAllAgents().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
        hosts = repository.getAllHosts().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
        tasks = repository.getAllTasks().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
        transactions = repository.getAllTransactions().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

        // Seed default rewards tasks if empty
        viewModelScope.launch {
            repository.getAllTasks().first().let { currentList ->
                if (currentList.isEmpty()) {
                    repository.insertTask(DailyTask(title = "Pass face verification", completed = false, coinsReward = 20000))
                    repository.insertTask(DailyTask(title = "Create owned room", completed = false, coinsReward = 5000))
                    repository.insertTask(DailyTask(title = "Sit in friend voice room (1 hour)", completed = false, coinsReward = 6000))
                    repository.insertTask(DailyTask(title = "Complete host registration profile", completed = false, coinsReward = 10000))
                }
            }
        }
    }

    fun generateAgentCode(): String = (1000..9999).random().toString()
    fun generateUserCode(): String = (100000..999999).random().toString()

    fun loginLocally(username: String, pword: String, onFinished: (Boolean) -> Unit) {
        viewModelScope.launch {
            _loginError.value = null
            val matchedUser = repository.getUserByUsername(username)
            if (matchedUser != null) {
                if (matchedUser.password == pword) {
                    _currentUser.value = matchedUser
                    onFinished(true)
                } else {
                    _loginError.value = "Incorrect password"
                    onFinished(false)
                }
            } else {
                // Auto create for easier offline sandbox experience!
                val randomCode = generateUserCode()
                val newUser = User(
                    userCode = randomCode,
                    username = username,
                    password = pword,
                    coins = 20000
                )
                val idLong = repository.insertUser(newUser)
                val createdUser = newUser.copy(id = idLong.toInt())
                _currentUser.value = createdUser
                
                // Add a welcome transaction
                repository.insertTransaction(CoinTransaction(
                    userId = createdUser.id,
                    amount = 20000,
                    type = "GENERATED",
                    paymentMethod = "Welcome Bonus",
                    timestamp = System.currentTimeMillis()
                ))
                onFinished(true)
            }
        }
    }

    fun logout() {
        _currentUser.value = null
    }

    fun performFaceVerification(onSuccess: () -> Unit) {
        viewModelScope.launch {
            val user = _currentUser.value ?: return@launch
            val updatedUser = user.copy(isVerified = true, coins = user.coins + 20000)
            repository.updateUser(updatedUser)
            _currentUser.value = updatedUser

            repository.insertTransaction(CoinTransaction(
                userId = user.id,
                amount = 20000,
                type = "GENERATED",
                paymentMethod = "Face Verification Reward",
                timestamp = System.currentTimeMillis()
            ))

            // Checkmark the onboarding task
            // and perform callback
            onSuccess()
        }
    }

    fun rechargeCoins(amount: Int, paymentMethod: String) {
        viewModelScope.launch {
            val user = _currentUser.value ?: return@launch
            val updatedUser = user.copy(coins = user.coins + amount)
            repository.updateUser(updatedUser)
            _currentUser.value = updatedUser

            repository.insertTransaction(CoinTransaction(
                userId = user.id,
                amount = amount,
                type = "RECHARGE",
                paymentMethod = paymentMethod,
                timestamp = System.currentTimeMillis()
            ))
        }
    }

    fun createOfflineAgent(name: String, initialRecruits: Int = 0) {
        viewModelScope.launch {
            val agent = Agent(
                agentCode = generateAgentCode(),
                name = name,
                recruits = initialRecruits,
                earnings = initialRecruits * 125.5
            )
            repository.insertAgent(agent)
        }
    }

    fun createOfflineHost(username: String, roomName: String, coins: Int = 0) {
        viewModelScope.launch {
            val host = Host(
                username = username,
                roomName = roomName,
                coinsEarned = coins
            )
            repository.insertHost(host)
        }
    }

    fun sendVirtualGift(giftName: String, cost: Int, receiverHostName: String) {
        viewModelScope.launch {
            val user = _currentUser.value ?: return@launch
            if (user.coins >= cost) {
                // Deduct from profile
                val updatedUser = user.copy(coins = user.coins - cost)
                repository.updateUser(updatedUser)
                _currentUser.value = updatedUser

                // Insert ledger record
                repository.insertTransaction(CoinTransaction(
                    userId = user.id,
                    amount = -cost,
                    type = "SENT_GIFT",
                    paymentMethod = "Gift: $giftName to @$receiverHostName",
                    timestamp = System.currentTimeMillis()
                ))

                // Track total coins to the host system
                createOfflineHost(receiverHostName, "${receiverHostName}'s Room", cost)
            }
        }
    }
}
