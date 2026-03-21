package com.ecom.seller.ui.call

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.ecom.seller.data.api.RetrofitClient
import com.ecom.seller.data.models.AgoraTokenRequest
import com.ecom.seller.databinding.ActivityIncomingCallBinding
import com.ecom.seller.utils.Constants
import com.ecom.seller.utils.SessionManager
import com.ecom.seller.utils.SocketManager
import kotlinx.coroutines.launch

class IncomingCallActivity : AppCompatActivity() {

    private lateinit var binding: ActivityIncomingCallBinding
    private lateinit var sessionManager: SessionManager
    private var callId: String = ""
    private var buyerId: String = ""
    private var buyerName: String = ""
    private var channelName: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityIncomingCallBinding.inflate(layoutInflater)
        setContentView(binding.root)
        sessionManager = SessionManager(this)

        callId = intent.getStringExtra(Constants.EXTRA_CALL_ID) ?: ""
        buyerId = intent.getStringExtra(Constants.EXTRA_BUYER_ID) ?: ""
        buyerName = intent.getStringExtra(Constants.EXTRA_BUYER_NAME) ?: "Buyer"
        channelName = intent.getStringExtra(Constants.EXTRA_CHANNEL_NAME) ?: ""

        binding.tvBuyerName.text = buyerName
        binding.tvCallStatus.text = "Incoming video call..."

        binding.btnAccept.setOnClickListener { acceptCall() }
        binding.btnReject.setOnClickListener { rejectCall() }

        SocketManager.on("call_ended") {
            runOnUiThread {
                Toast.makeText(this, "Call was cancelled", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    private fun acceptCall() {
        binding.progressBar.visibility = View.VISIBLE
        binding.btnAccept.isEnabled = false
        binding.btnReject.isEnabled = false

        lifecycleScope.launch {
            try {
                val token = sessionManager.getToken() ?: return@launch
                val sellerId = sessionManager.getUserId() ?: ""

                // Accept call in backend
                RetrofitClient.apiService.acceptCall("Bearer $token", callId)

                // Channel name MUST match what buyer web uses: call_${callSessionId}
                val finalChannel = "call_$callId"

                // Get Agora token for this channel
                val agoraResponse = RetrofitClient.apiService.getAgoraToken(
                    "Bearer $token",
                    AgoraTokenRequest(finalChannel, 0, "publisher")
                )
                val agoraToken = agoraResponse.body()?.token ?: ""

                // Notify buyer via socket with the channel name
                SocketManager.emitCallAccepted(callId, sellerId, buyerId, finalChannel)

                val intent = Intent(
                    this@IncomingCallActivity,
                    VideoCallActivity::class.java
                ).apply {
                    putExtra(Constants.EXTRA_CALL_ID, callId)
                    putExtra(Constants.EXTRA_CHANNEL_NAME, finalChannel)
                    putExtra(Constants.EXTRA_AGORA_TOKEN, agoraToken)
                    putExtra(Constants.EXTRA_BUYER_NAME, buyerName)
                }
                startActivity(intent)
                finish()

            } catch (e: Exception) {
                Toast.makeText(
                    this@IncomingCallActivity,
                    "Error: ${e.message}",
                    Toast.LENGTH_SHORT
                ).show()
                binding.btnAccept.isEnabled = true
                binding.btnReject.isEnabled = true
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun rejectCall() {
        lifecycleScope.launch {
            try {
                val token = sessionManager.getToken() ?: return@launch
                RetrofitClient.apiService.rejectCall("Bearer $token", callId)
                SocketManager.emitCallRejected(callId, buyerId)
            } catch (e: Exception) {
                // ignore
            } finally {
                finish()
            }
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        SocketManager.off("call_ended")
    }
}
