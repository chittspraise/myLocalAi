import styles from '../page.module.css'

export default function Signup(props){
    return (
      <form className={styles.signupForm}>
      <span className={styles.welcomeText}>Please Signup!</span>
      {props.error && <span className={styles.errorMessage}>{props.error}</span>}
      <input className={styles.name}
      name='name'
      key='name'     
      placeholder='name'
      onChange={(e)=>props.handleName(e)}/>
    <input className={styles.surname}
      name='surname'
      key='surname'
      placeholder='surname'
      onChange={(e)=>props.handleSurname(e)}/>
      <input className={styles.emailInput}
      name='email'
      key='email'
      placeholder='email'
      onChange={(e)=>props.handleEmail(e)}/>

      <input className={styles.passwordInput}
      type='password'
      key='password'
      placeholder='password'
      onChange={(e)=>props.handlePassword(e)}/>
      <div className={styles.authButtons}>
      <button className={styles.signupLoginButton}
      type='button'
      onClick={props.handleForm}>Login</button>
      <button className={styles.signupSignupButton}
      type='button'
      onClick={props.handleSignup}>signup</button>
      </div>
     </form>
    )
}