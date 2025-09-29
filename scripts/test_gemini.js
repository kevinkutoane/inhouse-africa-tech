(async ()=>{
  try {
    const res = await fetch('http://localhost:3000/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'Hello from local test - is Gemini reachable?' })
    });
    console.log('HTTP', res.status);
    const text = await res.text();
    console.log('BODY:', text);
  } catch (e) {
    console.error('ERR', e);
  }
})();
