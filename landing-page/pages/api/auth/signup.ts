import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password, firstName, lastName, userType = 'graduate' } = req.body

  // Validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Email und Passwort sind erforderlich' })
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Passwort muss mindestens 6 Zeichen lang sein' })
  }

  try {
    // Call the existing backend API
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001'
    
    const response = await fetch(`${backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        firstName: firstName || 'Neuer',
        lastName: lastName || 'Nutzer',
        userType
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return res.status(response.status).json({ 
        error: data.error || 'Registrierung fehlgeschlagen' 
      })
    }

    // Return success
    return res.status(201).json({
      success: true,
      message: 'Registrierung erfolgreich',
      user: data.user
    })
  } catch (error) {
    console.error('Signup error:', error)
    return res.status(500).json({ 
      error: 'Ein Fehler ist aufgetreten. Bitte versuche es später erneut.' 
    })
  }
}
