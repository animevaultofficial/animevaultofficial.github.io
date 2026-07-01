package com.animevault.app

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.navigation.fragment.findNavController

class ProfileFragment : Fragment() {
    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_profile, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val title = view.findViewById<TextView>(R.id.profileTitle)
        val message = view.findViewById<TextView>(R.id.profileMessage)
        val actionButton = view.findViewById<Button>(R.id.profileActionButton)
        val logoutButton = view.findViewById<Button>(R.id.profileLogoutButton)

        val user = UserSession.getUser()
        if (user == null) {
            title.text = "Profile"
            message.text = "You are not signed in. Please sign in to access your saved watch history and favorites."
            actionButton.text = "Sign In"
            logoutButton.visibility = View.GONE
        } else {
            title.text = "Welcome, ${user.username}"
            message.text = "Signed in as ${user.email}. You can log out or continue browsing."
            actionButton.text = "Go to Home"
            logoutButton.visibility = View.VISIBLE
        }

        actionButton.setOnClickListener {
            if (user == null) {
                findNavController().navigate(R.id.authFragment)
            } else {
                findNavController().navigate(R.id.homeFragment)
            }
        }

        logoutButton.setOnClickListener {
            UserSession.clearUser()
            message.text = "You are signed out. Please sign in to access your saved content."
            actionButton.text = "Sign In"
            logoutButton.visibility = View.GONE
        }
    }
}
