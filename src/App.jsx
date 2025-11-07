import React, { useEffect } from 'react'


const App = () => {
  useEffect(() => {
    window.location.href = '/user/login';
   
  }, [])
  
  return (
    <div>App</div>
  )
}

export default App