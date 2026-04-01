document.addEventListener("DOMContentLoaded", function() {
    const existingPatientCheckbox = document.getElementById('existing-patient');
    const patientIdInput = document.getElementById('patient-id');
    const appointmentForm = document.getElementById('appointment-form');
    const previewSection = document.getElementById('preview-section');
    const previewDetails = document.getElementById('preview-details');
    const submitButton = previewSection ? previewSection.querySelector('button[onclick="confirmAppointment()"]') : null;
    const doctorSelect = document.getElementById('doctor-select');

    if (!existingPatientCheckbox || !patientIdInput || !appointmentForm || !previewSection || !previewDetails) {
        return;
    }

    fetch('/api/doctors')
        .then(async (response) => {
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Unable to load doctors.');
            }

            if (doctorSelect) {
                doctorSelect.innerHTML = '<option value="" disabled selected>Select a Doctor</option>';
                data.doctors.forEach((doctor) => {
                    const option = document.createElement('option');
                    option.value = doctor.name;
                    option.textContent = `${doctor.name} - ${doctor.specialization}`;
                    doctorSelect.appendChild(option);
                });
            }
        })
        .catch((error) => {
            console.error(error);
        });

    existingPatientCheckbox.addEventListener('change', function() {
        if (this.checked) {
            patientIdInput.style.display = 'block';
        } else {
            patientIdInput.style.display = 'none';
        }
    });

    window.previewAppointment = function() {
        if (appointmentForm.checkValidity()) {
            const formData = new FormData(appointmentForm);
            
            let details = `
    
                <strong>Name:</strong> ${formData.get('full-name')}<br>
                <strong>Date of Birth:</strong> ${formData.get('dob')}<br>
                <strong>Email:</strong> ${formData.get('email')}<br>
                <strong>Phone:</strong> ${formData.get('phone')}<br><br>
                <strong>Doctor:</strong> ${formData.get('doctor')}<br>
                <strong>Appointment Date:</strong> ${formData.get('date')}<br>
                <strong>Time:</strong> ${formData.get('time-slot')}<br>
                <strong>Reason for Visit:</strong> ${formData.get('reason')}<br><br>
                <strong>Existing Patient:</strong> ${formData.get('existing-patient') ? 'Yes' : 'No'}<br>
                <strong>Patient ID:</strong> ${formData.get('patient-id')}
            `;
            previewDetails.innerHTML = details;
            previewSection.style.display = 'block';
            appointmentForm.style.display = 'none';
        } else {
            appointmentForm.reportValidity();
        }
    };

    window.confirmAppointment = function() {
        const formData = new FormData(appointmentForm);
        const payload = {
            fullName: formData.get('full-name'),
            dob: formData.get('dob'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            doctor: formData.get('doctor'),
            appointmentDate: formData.get('date'),
            timeSlot: formData.get('time-slot'),
            reason: formData.get('reason'),
            existingPatient: Boolean(formData.get('existing-patient')),
            patientId: formData.get('patient-id')
        };

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
        }

        fetch('/api/appointments', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Unable to submit appointment.');
                }

                const links = [];
                if (data.appointment && data.appointment.consultationLink) {
                    links.push(`Video consultation: ${data.appointment.consultationLink}`);
                }
                if (data.appointment && data.appointment.chatLink) {
                    links.push(`Chat: ${data.appointment.chatLink}`);
                }

                alert([data.message || 'Submitted successfully', ...links].join('\n'));
                appointmentForm.reset();
                patientIdInput.style.display = 'none';
                previewSection.style.display = 'none';
                appointmentForm.style.display = 'block';
            })
            .catch((error) => {
                alert(error.message);
            })
            .finally(() => {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit';
                }
            });
    };

    window.editAppointment = function() {
        previewSection.style.display = 'none';
        appointmentForm.style.display = 'block';
    };
    function togglePatientID() {
        const patientID = document.getElementById('patient-id');
        const existingPatient = document.getElementById('existing-patient');
        if (existingPatient.checked) {
            patientID.style.display = 'block';
        } else {
            patientID.style.display = 'none';
        }
    };
});
