import styles from '../page.module.css'

export default function Login (props){
    return (
     <form className={styles.loginForm}>
      {props.error && <span className={styles.errorMessage}>{props.error}</span>}
      <span className={styles.welcomeText}>Please Login!</span>
      <input className={styles.emailInput}
      type='email'
      key='email'
      placeholder='Email'
      onChange={(e)=>props.handleEmail(e)}/>
      <input className={styles.passwordInput}
      type='password'
      key='password'
      placeholder='password'
      onChange={(e)=>props.handlePassword(e)}/>
      <div className={styles.authButtons}>
      <button className={styles.loginButton}
      type='button'
      onClick={props.handleLogin}>Login</button>
      <button className={styles.signupButton}
      type='button'
      onClick={props.handleForm}>signup</button>
      </div>
     </form>
   
    )
}