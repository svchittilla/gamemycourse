document.getElementById('endSession').addEventListener('click', async () => {
  const endButton = document.getElementById('endSession');
  endButton.disabled = true;
  endButton.innerText = 'Ending...';

  // Optional confirmation to prevent accidental clicks
  if (!confirm('Are you sure you want to end this session?')) {
    endButton.disabled = false;
    endButton.innerText = 'End Session';
    return;
  }

  try {
    // 1. Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // 2. Execute script in the active tab to get engagement data
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => window.getFinalEngagementLog(),
      },
      (injectionResults) => {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          alert('Failed to collect engagement data.');
          endButton.disabled = false;
          endButton.innerText = 'End Session';
          return;
        }

        const data = injectionResults[0].result;
        if (!data) {
          alert('No engagement data found.');
          endButton.disabled = false;
          endButton.innerText = 'End Session';
          return;
        }

        console.log('Final engagement data:', data);

        // 3. Send data to backend for ingestion + prediction
        fetch('http://127.0.0.1:8000/events/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(res => {
          console.log('Session data ingested and predicted:', res);
          alert(`Session ended. Engagement score: ${res.predicted_engagement ?? 'N/A'}`);

          // 4. Optional: reset tracking in content script
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              if (window.resetTrackingData) window.resetTrackingData();
            }
          });
        })
        .catch(err => {
          console.error('Error sending end event:', err);
          alert('Failed to send engagement data.');
        })
        .finally(() => {
          endButton.disabled = false;
          endButton.innerText = 'End Session';
        });
      }
    );
  } catch (err) {
    console.error('Unexpected error:', err);
    alert('Something went wrong.');
    endButton.disabled = false;
    endButton.innerText = 'End Session';
  }
});
