package com.animevault.app

import android.app.Application

class MainApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        UserSession.init(this)
        AuthRepository.init(this)
    }
}
