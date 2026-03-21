package com.ecom.seller.services

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import com.ecom.seller.R
import com.ecom.seller.data.api.RetrofitClient
import com.ecom.seller.data.models.FcmTokenRequest
import com.ecom.seller.ui.call.IncomingCallActivity
import com.ecom.seller.utils.Constants
import com.ecom.seller.utils.SessionManager
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class MyFirebaseMessagingService : FirebaseMessagingService() {

    companion object {
        private const val TAG = "FCMService"
        private const val CHANNEL_ID = "ecom_seller_channel"
        private const val CHANNEL_NAME = "Ecom Seller Notifications"
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        Log.d(TAG, "New FCM token: $token")
        sendTokenToServer(token)
    }

    private fun sendTokenToServer(fcmToken: String) {
        val sessionManager = SessionManager(this)
        val jwtToken = sessionManager.getToken() ?: return

        CoroutineScope(Dispatchers.IO).launch {
            try {
                RetrofitClient.apiService.updateFcmToken(
                    "Bearer $jwtToken",
                    FcmTokenRequest(fcmToken)
                )
            } catch (e: Exception) {
                Log.e(TAG, "Error sending FCM token: ${e.message}")
            }
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        super.onMessageReceived(remoteMessage)
        Log.d(TAG, "Message received from: ${remoteMessage.from}")

        val data = remoteMessage.data
        val type = data["type"]

        when (type) {
            "incoming_call" -> handleIncomingCall(data)
            "new_order" -> handleNewOrder(remoteMessage)
            else -> handleGeneralNotification(remoteMessage)
        }
    }

    private fun handleIncomingCall(data: Map<String, String>) {
        val callId = data["callId"] ?: return
        val buyerId = data["buyerId"] ?: ""
        val buyerName = data["buyerName"] ?: "Buyer"
        val channelName = data["channelName"] ?: ""

        val intent = Intent(this, IncomingCallActivity::class.java).apply {
            putExtra(Constants.EXTRA_CALL_ID, callId)
            putExtra(Constants.EXTRA_BUYER_ID, buyerId)
            putExtra(Constants.EXTRA_BUYER_NAME, buyerName)
            putExtra(Constants.EXTRA_CHANNEL_NAME, channelName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        startActivity(intent)
    }

    private fun handleNewOrder(remoteMessage: RemoteMessage) {
        val title = remoteMessage.notification?.title ?: "New Order!"
        val body = remoteMessage.notification?.body ?: "You have a new order"
        showNotification(title, body, 1001)
    }

    private fun handleGeneralNotification(remoteMessage: RemoteMessage) {
        val title = remoteMessage.notification?.title ?: "Ecom Seller"
        val body = remoteMessage.notification?.body ?: ""
        showNotification(title, body, 1002)
    }

    private fun showNotification(title: String, body: String, notifId: Int) {
        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notification)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .build()

        notificationManager.notify(notifId, notification)
    }
}
