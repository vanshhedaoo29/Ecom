package com.ecom.seller.ui.orders

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.LinearLayoutManager
import com.ecom.seller.data.api.RetrofitClient
import com.ecom.seller.data.models.Order
import com.ecom.seller.data.models.UpdateOrderStatusRequest
import com.ecom.seller.databinding.FragmentOrdersBinding
import com.ecom.seller.utils.SessionManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class OrdersFragment : Fragment() {

    private var _binding: FragmentOrdersBinding? = null
    private val binding get() = _binding!!
    private lateinit var sessionManager: SessionManager
    private val orders = mutableListOf<Order>()
    private lateinit var adapter: OrderAdapter
    private val job = Job()
    private val scope = CoroutineScope(Dispatchers.Main + job)

    override fun onCreateView(inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?): View {
        _binding = FragmentOrdersBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        sessionManager = SessionManager(requireContext())
        adapter = OrderAdapter(orders) { order, status -> updateStatus(order, status) }
        binding.recyclerView.layoutManager = LinearLayoutManager(requireContext())
        binding.recyclerView.adapter = adapter
        loadOrders()
    }

    override fun onResume() {
        super.onResume()
        if (_binding != null) loadOrders()
    }

    private fun loadOrders() {
        val token = sessionManager.getToken() ?: return
        if (_binding == null) return
        _binding?.progressBar?.visibility = View.VISIBLE

        scope.launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.getSellerOrders("Bearer $token")
                }
                if (_binding == null) return@launch
                if (response.isSuccessful) {
                    val list = response.body()?.orders ?: emptyList()
                    orders.clear()
                    orders.addAll(list)
                    adapter.notifyDataSetChanged()
                    _binding?.tvEmpty?.visibility = if (orders.isEmpty()) View.VISIBLE else View.GONE
                }
            } catch (e: Exception) {
                if (_binding != null && isAdded) {
                    Toast.makeText(requireContext(), "Error loading orders", Toast.LENGTH_SHORT).show()
                }
            } finally {
                if (_binding != null) {
                    _binding?.progressBar?.visibility = View.GONE
                }
            }
        }
    }

    private fun updateStatus(order: Order, status: String) {
        val token = sessionManager.getToken() ?: return
        scope.launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    RetrofitClient.apiService.updateOrderStatus(
                        "Bearer $token", order.getOrderId(), UpdateOrderStatusRequest(status)
                    )
                }
                if (_binding == null) return@launch
                if (response.isSuccessful) {
                    if (isAdded) Toast.makeText(requireContext(), "Order marked as $status", Toast.LENGTH_SHORT).show()
                    loadOrders()
                } else {
                    if (isAdded) Toast.makeText(requireContext(), "Failed to update status", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                if (isAdded && _binding != null) {
                    Toast.makeText(requireContext(), "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        job.cancel()
        _binding = null
    }
}