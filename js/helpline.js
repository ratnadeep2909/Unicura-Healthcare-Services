window.addEventListener('DOMContentLoaded', function() {
  const helplineContainer = document.querySelector('.helpline-container');
  helplineContainer.style.opacity = '0';
  helplineContainer.style.animation = 'fadeIn 0.5s ease-in-out forwards';

  const contactDetailsContainer = document.querySelector('.contact-details-container');
  contactDetailsContainer.style.opacity = '0';
  setTimeout(function() {
    contactDetailsContainer.style.animation = 'fadeIn 0.5s ease-in-out forwards';
  }, 300);

  const findHospitalsButton = document.getElementById('findHospitalsButton');
  const hospitalResults = document.getElementById('hospitalResults');

  if (findHospitalsButton && hospitalResults) {
    findHospitalsButton.addEventListener('click', function() {
      if (!navigator.geolocation) {
        hospitalResults.innerHTML = '<div style="background: rgba(255,255,255,0.06); border-radius: 18px; padding: 20px; color: #d6eff0;">Location access is not supported in this browser.</div>';
        return;
      }

      hospitalResults.innerHTML = '<div style="background: rgba(255,255,255,0.06); border-radius: 18px; padding: 20px; color: #d6eff0;">Detecting your location and loading nearby hospitals...</div>';

      navigator.geolocation.getCurrentPosition(async function(position) {
        try {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const response = await fetch(`/api/hospitals?lat=${latitude}&lng=${longitude}`);
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.message || 'Unable to fetch nearby hospitals.');
          }

          if (!data.hospitals || !data.hospitals.length) {
            hospitalResults.innerHTML = '<div style="background: rgba(255,255,255,0.06); border-radius: 18px; padding: 20px; color: #d6eff0;">No nearby hospitals were found.</div>';
            return;
          }

          hospitalResults.innerHTML = data.hospitals.map(function(hospital) {
            return `
              <article style="background: rgba(255,255,255,0.08); border-radius: 18px; padding: 20px; color: #effafa; box-shadow: 0 12px 24px rgba(0,0,0,0.15);">
                <div style="display: inline-flex; background: rgba(63,188,192,0.16); color: #8df4ff; border-radius: 999px; padding: 6px 12px; font-size: 13px; font-weight: 700; margin-bottom: 12px;">
                  ${hospital.emergencyAvailable ? 'Emergency Available' : 'Emergency Limited'}
                </div>
                <h3 style="margin-top: 0;">${hospital.name}</h3>
                <p><strong>Address:</strong> ${hospital.address}</p>
                <p><strong>City:</strong> ${hospital.city}</p>
                <p><strong>Phone:</strong> ${hospital.phone}</p>
                <p><strong>Distance:</strong> ${hospital.distanceKm != null ? `${hospital.distanceKm} km` : 'Not available'}</p>
                <p><strong>Available Beds:</strong> ${hospital.availableBeds} / ${hospital.totalBeds}</p>
                <p><strong>ICU Beds:</strong> ${hospital.availableIcuBeds}</p>
                <p><strong>Oxygen Beds:</strong> ${hospital.availableOxygenBeds}</p>
              </article>
            `;
          }).join('');
        } catch (error) {
          hospitalResults.innerHTML = `<div style="background: rgba(255,255,255,0.06); border-radius: 18px; padding: 20px; color: #d6eff0;">${error.message}</div>`;
        }
      }, function() {
        hospitalResults.innerHTML = '<div style="background: rgba(255,255,255,0.06); border-radius: 18px; padding: 20px; color: #d6eff0;">Location permission was denied. Please allow access and try again.</div>';
      });
    });
  }
});

ScrollReveal({
  //reset: true ,
  distance: '60px',
  duration: 2500,
  delay: 400
});
ScrollReveal().reveal('.content', { delay: 400, origin: 'left' ,interval:200});

  document.getElementById('emergencyButton').addEventListener('click', function() {
    var popup = document.getElementById('popup');
    popup.style.display = 'block';
    setTimeout(function() {
      popup.style.display = 'none';
    }, 3000); // Hide popup after 3 seconds
  });
