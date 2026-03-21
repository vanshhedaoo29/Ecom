package com.ecom.seller.ui.live

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.SurfaceView
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.ecom.seller.data.api.RetrofitClient
import com.ecom.seller.data.models.EndLiveRequest
import com.ecom.seller.data.models.StartLiveRequest
import com.ecom.seller.databinding.ActivityGoLiveBinding
import com.ecom.seller.utils.Constants
import com.ecom.seller.utils.SessionManager
import com.ecom.seller.utils.SocketManager
import io.agora.rtc2.ChannelMediaOptions
import io.agora.rtc2.Constants as AgoraConstants
import io.agora.rtc2.IRtcEngineEventHandler
import io.agora.rtc2.RtcEngine
import io.agora.rtc2.video.VideoCanvas
import kotlinx.coroutines.launch
import org.json.JSONObject

class GoLiveActivity : AppCompatActivity() {

    private lateinit var binding: ActivityGoLiveBinding
    private lateinit var sessionManager: SessionManager
    private var rtcEngine: RtcEngine? = null
    private var sessionId: String = ""
    private var channelName: String = ""
    private var isLive = false

    companion object {
        private const val PERMISSION_REQ = 100
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
    }

    private val rtcEventHandler = object : IRtcEngineEventHandler() {
        override fun onUserJoined(uid: Int, elapsed: Int) {
            runOnUiThread {
                binding.tvViewerCount.text = "Viewers: updating..."
            }
        }
        override fun onUserOffline(uid: Int, reason: Int) {}
        override fun onJoinChannelSuccess(channel: String?, uid: Int, elapsed: Int) {
            runOnUiThread {
                binding.tvStatus.text = "🔴 LIVE"
                isLive = true
            }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityGoLiveBinding.inflate(layoutInflater)
        setContentView(binding.root)
        sessionManager = SessionManager(this)

        if (!hasPermissions()) {
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSION_REQ)
        } else {
            initAgora()
        }

        binding.btnGoLive.setOnClickListener { startLive() }
        binding.btnStopLive.setOnClickListener { stopLive() }

        setupSocketListeners()
    }

    private fun hasPermissions() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

    private fun initAgora() {
        try {
            rtcEngine = RtcEngine.create(this, Constants.AGORA_APP_ID, rtcEventHandler)
            rtcEngine?.enableVideo()
            rtcEngine?.startPreview()

            val surfaceView = SurfaceView(this)
            binding.localVideoContainer.addView(surfaceView)
            rtcEngine?.setupLocalVideo(VideoCanvas(surfaceView, VideoCanvas.RENDER_MODE_HIDDEN, 0))
        } catch (e: Exception) {
            Toast.makeText(this, "Agora init failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    private fun startLive() {
        val shopId = sessionManager.getShopId()
        if (shopId.isNullOrEmpty()) {
            Toast.makeText(this, "Shop not found. Please re-login.", Toast.LENGTH_SHORT).show()
            return
        }

        binding.btnGoLive.isEnabled = false
        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val token = sessionManager.getToken() ?: return@launch

                // Use agora/live-channel — generates token + creates session
                val body = mapOf(
                    "shopId" to shopId,
                    "uid" to 0
                )
                val response = RetrofitClient.apiService.startLiveWithToken(
                    "Bearer $token", body
                )

                if (response.isSuccessful) {
                    val data = response.body()
                    channelName = data?.channelName ?: ""
                    sessionId = data?.liveSessionId?.toString() ?: ""
                    val agoraToken = data?.token ?: ""

                    // Get liveSessionId from raw response
                    joinAgoraChannel(channelName, agoraToken)
                    SocketManager.emitGoLive(shopId, channelName)

                    binding.btnGoLive.visibility = View.GONE
                    binding.btnStopLive.visibility = View.VISIBLE
                    binding.tvViewerCount.visibility = View.VISIBLE
                    binding.tvStatus.text = "🔴 LIVE"
                } else {
                    Toast.makeText(this@GoLiveActivity,
                        "Failed to start live: ${response.code()}",
                        Toast.LENGTH_SHORT).show()
                    binding.btnGoLive.isEnabled = true
                }
            } catch (e: Exception) {
                Toast.makeText(this@GoLiveActivity,
                    "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                binding.btnGoLive.isEnabled = true
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }


    private fun joinAgoraChannel(channel: String, agoraToken: String) {
        val options = ChannelMediaOptions().apply {
            channelProfile = AgoraConstants.CHANNEL_PROFILE_LIVE_BROADCASTING
            clientRoleType = AgoraConstants.CLIENT_ROLE_BROADCASTER
        }
        rtcEngine?.joinChannel(agoraToken.ifEmpty { null }, channel, 0, options)
    }

    private fun stopLive() {
        isLive = false
        lifecycleScope.launch {
            try {
                val token = sessionManager.getToken() ?: return@launch
                RetrofitClient.apiService.endLive("Bearer $token", EndLiveRequest(sessionId))
                SocketManager.emitEndLive(channelName)
            } catch (e: Exception) {
                // ignore
            } finally {
                rtcEngine?.leaveChannel()
                RtcEngine.destroy()
                rtcEngine = null
                finish()
            }
        }
    }

    private fun setupSocketListeners() {
        SocketManager.on("viewer_count") { args ->
            if (args.isNotEmpty()) {
                val data = args[0] as? JSONObject
                val count = data?.optInt("count", 0) ?: 0
                runOnUiThread { binding.tvViewerCount.text = "👁 $count watching" }
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQ && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
            initAgora()
        } else {
            Toast.makeText(this, "Camera and microphone permissions required", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        SocketManager.off("viewer_count")
        // Only stop preview, don't leave channel or end session
        // stopLive() handles the proper cleanup when seller taps Stop
        rtcEngine?.stopPreview()
        if (!isLive) {
            // Only destroy if never went live
            RtcEngine.destroy()
            rtcEngine = null
        }
    }



    override fun onBackPressed() {
        if (isLive) {
            Toast.makeText(this, "Tap Stop Live to end the stream", Toast.LENGTH_SHORT).show()
        } else {
            super.onBackPressed()
        }
    }
}
