package com.ecom.seller.utils

import android.util.Log
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.URISyntaxException

object SocketManager {

    private var socket: Socket? = null
    private const val TAG = "SocketManager"

    fun connect(token: String, userId: String) {
        try {
            val options = IO.Options().apply {
                auth = mapOf("token" to token)
                transports = arrayOf("websocket")
                reconnection = true
                reconnectionAttempts = 5
                reconnectionDelay = 1000
            }
            socket = IO.socket(Constants.SOCKET_URL, options)
            socket?.connect()

            // Register userId with server so seller can receive incoming_call
            socket?.on(Socket.EVENT_CONNECT) {
                Log.d(TAG, "Socket connected, registering userId: $userId")
                val data = JSONObject().apply { put("userId", userId) }
                socket?.emit("register", data)
            }

            Log.d(TAG, "Socket connecting...")
        } catch (e: URISyntaxException) {
            Log.e(TAG, "Socket URI error: ${e.message}")
        }
    }

    fun disconnect() {
        socket?.disconnect()
        socket = null
    }

    fun isConnected(): Boolean = socket?.connected() ?: false

    fun on(event: String, callback: (Array<Any>) -> Unit) {
        socket?.on(event) { args -> callback(args) }
    }

    fun off(event: String) {
        socket?.off(event)
    }

    fun emit(event: String, data: JSONObject) {
        socket?.emit(event, data)
    }

    fun emitGoLive(shopId: String, channelName: String) {
        val data = JSONObject().apply {
            put("shopId", shopId)
            put("channelName", channelName)
        }
        socket?.emit("go_live", data)
    }

    fun emitEndLive(channelName: String) {
        val data = JSONObject().apply {
            put("channelName", channelName)
        }
        socket?.emit("end_live", data)
    }

    fun emitCallAccepted(callSessionId: String, sellerId: String, buyerId: String, agoraChannel: String) {
        val data = JSONObject().apply {
            put("callSessionId", callSessionId)
            put("sellerId", sellerId)
            put("buyerId", buyerId)
            put("agoraChannel", agoraChannel)
        }
        socket?.emit("call_accepted", data)
    }

    fun emitCallRejected(callSessionId: String, buyerId: String) {
        val data = JSONObject().apply {
            put("callSessionId", callSessionId)
            put("buyerId", buyerId)
        }
        socket?.emit("call_rejected", data)
    }

    fun emitCallEnded(callSessionId: String) {
        val data = JSONObject().apply {
            put("callSessionId", callSessionId)
        }
        socket?.emit("call_ended", data)
    }

    fun emitSendMessage(message: String, channelId: String) {
        val data = JSONObject().apply {
            put("message", message)
            put("channelId", channelId)
        }
        socket?.emit("send_message", data)
    }

    fun emitGarmentCaptured(imageUrl: String, callId: String) {
        val data = JSONObject().apply {
            put("imageUrl", imageUrl)
            put("callId", callId)
        }
        socket?.emit("garment_captured", data)
    }
}
