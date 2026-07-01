package com.animevault.app

data class User(
    val id: Long,
    val email: String,
    val username: String,
    val avatar: String?,
    val banner: String?,
    val isAdmin: Boolean = false
)
