package com.ecom.seller.data.models

data class LiveSession(
    val sessionId: String = "",
    val channelName: String = "",
    val token: String = "",
    val shopId: String = ""
)

data class CallSession(
    val callId: String = "",
    val channelName: String = "",
    val token: String = "",
    val buyerId: String = "",
    val sellerId: String = ""
)

data class ApiResponse<T>(
    val success: Boolean = false,
    val message: String = "",
    val token: String? = null,        // ← agora token
    val channelName: String? = null,
    val sessionId: String? = null,
    val liveSessionId: Int? = null,   // ← add this
    val callId: String? = null,
    val user: User? = null,
    val shop: Shop? = null,
    val products: List<Product>? = null,
    val orders: List<Order>? = null,
    val count: Int? = null,
    val data: T? = null
)
data class AgoraTokenResponse(
    val token: String = "",
    val channelName: String = "",
    val uid: Int = 0
)

data class FcmTokenRequest(val fcmToken: String)
data class LoginRequest(val email: String, val password: String)
data class RegisterRequest(val name: String, val email: String, val password: String, val role: String = "seller", val shopName: String)
data class UpdateShopRequest(val name: String, val description: String, val category: String)
data class UpdateOrderStatusRequest(val status: String)
data class StartLiveRequest(val shopId: String)
data class EndLiveRequest(val sessionId: String)
data class AgoraTokenRequest(val channelName: String, val uid: Int, val role: String)
data class AcceptCallRequest(val callId: String)
data class RejectCallRequest(val callId: String)
data class EndCallRequest(val callId: String)
