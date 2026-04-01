document.addEventListener('DOMContentLoaded', function() {
    const portalForm = document.getElementById('portalLoginForm');
    const portalEmail = document.getElementById('portalEmail');
    const portalPassword = document.getElementById('portalPassword');
    const portalMessage = document.getElementById('portalLoginMessage');

    if (!portalForm || !portalEmail || !portalPassword || !portalMessage) {
        return;
    }

    portalForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: portalEmail.value.trim(),
                    password: portalPassword.value
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Unable to log in right now.');
            }

            localStorage.setItem('unicuraAuth', data.token);
            localStorage.setItem('unicuraUser', JSON.stringify(data.user));
            portalMessage.textContent = data.message;
            portalMessage.style.display = 'block';

            setTimeout(function() {
                window.location.href = 'patient-dashboard.html';
            }, 800);
        } catch (error) {
            portalMessage.textContent = error.message;
            portalMessage.style.display = 'block';
        }
    });
});
