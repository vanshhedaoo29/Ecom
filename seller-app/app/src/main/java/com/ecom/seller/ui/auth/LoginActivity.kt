package com.ecom.seller.ui.auth

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ecom.seller.data.api.RetrofitClient
import com.ecom.seller.data.models.LoginRequest
import com.ecom.seller.databinding.ActivityLoginBinding
import com.ecom.seller.ui.home.HomeActivity
import com.ecom.seller.utils.SessionManager
import kotlinx.coroutines.launch

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        sessionManager = SessionManager(this)

        // Auto-login if token exists
        if (sessionManager.isLoggedIn()) {
            goToHome()
            return
        }

        setupClickListeners()
    }

    private fun setupClickListeners() {
        binding.btnLogin.setOnClickListener {
            val email = binding.etEmail.text.toString().trim()
            val password = binding.etPassword.text.toString().trim()

            if (email.isEmpty() || password.isEmpty()) {
                Toast.makeText(this, "Please fill all fields", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            login(email, password)
        }

        binding.tvRegister.setOnClickListener {
            startActivity(Intent(this, RegisterActivity::class.java))
        }
    }

    private fun login(email: String, password: String) {
        binding.progressBar.visibility = View.VISIBLE
        binding.btnLogin.isEnabled = false

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.login(LoginRequest(email, password))
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true) {
                        body.token?.let { sessionManager.saveToken(it) }
                        body.user?.let { user ->
                            sessionManager.saveUserId(user.getUserId())
                            sessionManager.saveUserName(user.name)
                            sessionManager.saveUserEmail(user.email)
                        }
                        // Fetch shop info
                        fetchShopAndProceed()
                    } else {
                        showError(body?.message ?: "Login failed")
                    }
                } else {
                    showError("Login failed: ${response.code()}")
                }
            } catch (e: Exception) {
                showError("Network error: ${e.message}")
            } finally {
                binding.progressBar.visibility = View.GONE
                binding.btnLogin.isEnabled = true
            }
        }
    }

    private suspend fun fetchShopAndProceed() {
        try {
            val token = sessionManager.getToken() ?: return
            val shopResponse = RetrofitClient.apiService.getMyShop("Bearer $token")
            if (shopResponse.isSuccessful) {
                shopResponse.body()?.shop?.let { shop ->
                    sessionManager.saveShopId(shop.getShopId())
                }
            }
        } catch (e: Exception) {
            // Shop fetch failed but we can still proceed
        }
        goToHome()
    }

    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    private fun goToHome() {
        startActivity(Intent(this, HomeActivity::class.java))
        finish()
    }
}