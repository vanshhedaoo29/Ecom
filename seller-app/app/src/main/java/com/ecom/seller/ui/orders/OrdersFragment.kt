package com.ecom.seller.ui.orders

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.ecom.seller.data.api.RetrofitClient
import com.ecom.seller.data.models.Order
import com.ecom.seller.data.models.UpdateOrderStatusRequest
import com.ecom.seller.databinding.FragmentOrdersBinding
import com.ecom.seller.utils.SessionManager
import kotlinx.coroutines.launch

class OrdersFragment : Fragment() {

    private var _binding: FragmentOrdersBinding? = null
    private val binding get() = _binding!!
    private lateinit var sessionManager: SessionManager
    private val orders = mutableListOf<Order>()
    private lateinit var adapter: OrderAdapter

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
        loadOrders()
    }

    private fun loadOrders() {
        val token = sessionManager.getToken() ?: return
        binding.progressBar.visibility = View.VISIBLE

        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.getSellerOrders("Bearer $token")
                if (response.isSuccessful) {
                    val list = response.body()?.orders ?: emptyList()
                    orders.clear()
                    orders.addAll(list)
                    adapter.notifyDataSetChanged()
                    binding.tvEmpty.visibility = if (orders.isEmpty()) View.VISIBLE else View.GONE
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Error loading orders", Toast.LENGTH_SHORT).show()
            } finally {
                binding.progressBar.visibility = View.GONE
            }
        }
    }

    private fun updateStatus(order: Order, status: String) {
        val token = sessionManager.getToken() ?: return
        lifecycleScope.launch {
            try {
                val response = RetrofitClient.apiService.updateOrderStatus(
                    "Bearer $token", order.getOrderId(), UpdateOrderStatusRequest(status)
                )
                if (response.isSuccessful) {
                    Toast.makeText(requireContext(), "Order marked as $status", Toast.LENGTH_SHORT).show()
                    loadOrders()
                } else {
                    Toast.makeText(requireContext(), "Failed to update status", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(requireContext(), "Error: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}