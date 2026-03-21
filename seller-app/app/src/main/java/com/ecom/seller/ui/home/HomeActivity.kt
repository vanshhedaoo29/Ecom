package com.ecom.seller.ui.home

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.ecom.seller.R
import com.ecom.seller.databinding.ActivityHomeBinding
import com.ecom.seller.ui.call.IncomingCallActivity
import com.ecom.seller.ui.live.GoLiveActivity
import com.ecom.seller.ui.orders.OrdersFragment
import com.ecom.seller.ui.products.ProductsFragment
import com.ecom.seller.utils.Constants
import com.ecom.seller.utils.SessionManager
import com.ecom.seller.utils.SocketManager
import org.json.JSONObject

class HomeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityHomeBinding
    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        sessionManager = SessionManager(this)
        connectSocket()
        setupBottomNavigation()
        setupGoLiveButton()

        if (savedInstanceState == null) {
            loadDashboard()
        }
    }

    private fun connectSocket() {
        val token = sessionManager.getToken() ?: return
        val userId = sessionManager.getUserId() ?: return

        // Pass userId so backend can register seller for incoming calls
        SocketManager.connect(token, userId)

        // Listen for incoming call — backend emits 'incoming_call' to seller
        SocketManager.on("incoming_call") { args ->
            if (args.isNotEmpty()) {
                val data = args[0] as? JSONObject ?: return@on
                Log.d("HomeActivity", "Incoming call: $data")
                runOnUiThread {
                    val intent = Intent(this, IncomingCallActivity::class.java).apply {
                        putExtra(Constants.EXTRA_CALL_ID, data.optString("callSessionId"))
                        putExtra(Constants.EXTRA_BUYER_ID, data.optString("buyerId"))
                        putExtra(Constants.EXTRA_BUYER_NAME, data.optString("buyerName"))
                        putExtra(Constants.EXTRA_CHANNEL_NAME, data.optString("agoraChannel", ""))
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    startActivity(intent)
                }
            }
        }

        SocketManager.on("connect") {
            Log.d("HomeActivity", "Socket connected ✅")
        }
    }

    private fun setupBottomNavigation() {
        binding.bottomNavigation.setOnItemSelectedListener { item ->
            when (item.itemId) {
                R.id.nav_dashboard -> { loadDashboard(); true }
                R.id.nav_products -> { loadProducts(); true }
                R.id.nav_orders -> { loadOrders(); true }
                else -> false
            }
        }
    }

    private fun setupGoLiveButton() {
        binding.fabGoLive.setOnClickListener {
            startActivity(Intent(this, GoLiveActivity::class.java))
        }
    }

    private fun loadDashboard() {
        binding.tvDashboard.text = "Welcome, ${sessionManager.getUserName()}!\n\nShop Dashboard\n\nUse the tabs below to manage your shop."
        binding.fragmentContainer.removeAllViews()
    }

    private fun loadProducts() {
        binding.tvDashboard.text = ""
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, ProductsFragment())
            .commit()
    }

    private fun loadOrders() {
        binding.tvDashboard.text = ""
        supportFragmentManager.beginTransaction()
            .replace(R.id.fragmentContainer, OrdersFragment())
            .commit()
    }

    override fun onDestroy() {
        super.onDestroy()
        SocketManager.off("incoming_call")
    }
}
