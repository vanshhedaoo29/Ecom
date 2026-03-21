package com.ecom.seller.ui.call

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import android.view.SurfaceView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.ecom.seller.data.api.RetrofitClient
import com.ecom.seller.databinding.ActivityVideoCallBinding
import com.ecom.seller.utils.Constants
import com.ecom.seller.utils.SessionManager
import com.ecom.seller.utils.SocketManager
import io.agora.rtc2.ChannelMediaOptions
import io.agora.rtc2.Constants as AgoraConstants
import io.agora.rtc2.IRtcEngineEventHandler
import io.agora.rtc2.RtcEngine
import io.agora.rtc2.video.VideoCanvas
import kotlinx.coroutines.launch

class VideoCallActivity : AppCompatActivity() {

    private lateinit var binding: ActivityVideoCallBinding
    private lateinit var sessionManager: SessionManager
    private var rtcEngine: RtcEngine? = null
    private var callId: String = ""
    private var channelName: String = ""
    private var agoraToken: String = ""

    companion object {
        private const val PERMISSION_REQ = 101
        private val REQUIRED_PERMISSIONS = arrayOf(Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO)
    }

    private val rtcEventHandler = object : IRtcEngineEventHandler() {
        override fun onUserJoined(uid: Int, elapsed: Int) {
            runOnUiThread { setupRemoteVideo(uid) }
        }
        override fun onUserOffline(uid: Int, reason: Int) {
            runOnUiThread {
                binding.remoteVideoContainer.removeAllViews()
                Toast.makeText(this@VideoCallActivity, "Buyer disconnected", Toast.LENGTH_SHORT).show()
                endCall()
            }
        }
        override fun onJoinChannelSuccess(channel: String?, uid: Int, elapsed: Int) {
            runOnUiThread { binding.tvCallStatus.text = "Connected ✅" }
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityVideoCallBinding.inflate(layoutInflater)
        setContentView(binding.root)
        sessionManager = SessionManager(this)

        callId = intent.getStringExtra(Constants.EXTRA_CALL_ID) ?: ""
        channelName = intent.getStringExtra(Constants.EXTRA_CHANNEL_NAME) ?: ""
        agoraToken = intent.getStringExtra(Constants.EXTRA_AGORA_TOKEN) ?: ""
        val buyerName = intent.getStringExtra(Constants.EXTRA_BUYER_NAME) ?: "Buyer"

        binding.tvBuyerName.text = buyerName
        binding.tvCallStatus.text = "Connecting..."
        binding.btnEndCall.setOnClickListener { endCall() }

        if (!hasPermissions()) {
            ActivityCompat.requestPermissions(this, REQUIRED_PERMISSIONS, PERMISSION_REQ)
        } else {
            initAgoraAndJoin()
        }

        SocketManager.on("call_ended") {
            runOnUiThread {
                Toast.makeText(this, "Call ended by buyer", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    private fun hasPermissions() = REQUIRED_PERMISSIONS.all {
        ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

    private fun initAgoraAndJoin() {
        try {
            rtcEngine = RtcEngine.create(this, Constants.AGORA_APP_ID, rtcEventHandler)
            rtcEngine?.enableVideo()

            val localSurface = SurfaceView(this)
            binding.localVideoContainer.addView(localSurface)
            rtcEngine?.setupLocalVideo(VideoCanvas(localSurface, VideoCanvas.RENDER_MODE_HIDDEN, 0))
            rtcEngine?.startPreview()

            val options = ChannelMediaOptions().apply {
                channelProfile = AgoraConstants.CHANNEL_PROFILE_COMMUNICATION
                clientRoleType = AgoraConstants.CLIENT_ROLE_BROADCASTER
                publishCameraTrack = true
                publishMicrophoneTrack = true
            }
            rtcEngine?.joinChannel(agoraToken.ifEmpty { null }, channelName, 0, options)
        } catch (e: Exception) {
            Toast.makeText(this, "Video init failed: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun setupRemoteVideo(uid: Int) {
        val remoteSurface = SurfaceView(this)
        binding.remoteVideoContainer.removeAllViews()
        binding.remoteVideoContainer.addView(remoteSurface)
        rtcEngine?.setupRemoteVideo(VideoCanvas(remoteSurface, VideoCanvas.RENDER_MODE_HIDDEN, uid))
    }

    private fun endCall() {
        lifecycleScope.launch {
            try {
                val token = sessionManager.getToken() ?: return@launch
                RetrofitClient.apiService.endCall("Bearer $token", callId)
                SocketManager.emitCallEnded(callId)
            } catch (e: Exception) {
                // ignore
            } finally {
                rtcEngine?.leaveChannel()
                finish()
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQ && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
            initAgoraAndJoin()
        } else {
            Toast.makeText(this, "Permissions required", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        SocketManager.off("call_ended")
        rtcEngine?.leaveChannel()
        RtcEngine.destroy()
        rtcEngine = null
    }
}
