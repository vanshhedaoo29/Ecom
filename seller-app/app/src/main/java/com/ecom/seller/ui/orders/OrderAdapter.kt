package com.ecom.seller.ui.orders

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.ecom.seller.data.models.Order
import com.ecom.seller.databinding.ItemOrderBinding

class OrderAdapter(
    private val orders: List<Order>,
    private val onStatusUpdate: (Order, String) -> Unit
) : RecyclerView.Adapter<OrderAdapter.OrderViewHolder>() {

    inner class OrderViewHolder(private val binding: ItemOrderBinding) :
        RecyclerView.ViewHolder(binding.root) {
        fun bind(order: Order) {
            binding.tvBuyerName.text = "Buyer: ${order.buyerName}"
            binding.tvProductName.text = order.productName
            binding.tvQuantity.text = "Qty: ${order.quantity}"
            binding.tvPrice.text = "₹${order.totalPrice}"
            binding.tvStatus.text = "Status: ${order.status}"

            binding.btnPacked.visibility = if (order.status == "pending") View.VISIBLE else View.GONE
            binding.btnDispatched.visibility = if (order.status == "packed") View.VISIBLE else View.GONE

            binding.btnPacked.setOnClickListener { onStatusUpdate(order, "packed") }
            binding.btnDispatched.setOnClickListener { onStatusUpdate(order, "dispatched") }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): OrderViewHolder {
        val binding = ItemOrderBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return OrderViewHolder(binding)
    }

    override fun onBindViewHolder(holder: OrderViewHolder, position: Int) = holder.bind(orders[position])
    override fun getItemCount() = orders.size
}
