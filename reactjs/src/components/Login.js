import React, { useEffect, useRef, useState } from "react";
import PrivacyPolicy from "Components/Common/PrivacyPolicy";
import Footer from "Components/Common/Footer";
import { ReactComponent as MainLogoWhite } from "assets/Logos/MainLogoWhite.svg";
import { ReactComponent as MainLogo } from "assets/Logos/MainLogo.svg";
import { Link, useNavigate } from "react-router-dom";
import { ReactComponent as EyeIcon } from "assets/Icons/EyeIcon.svg";
import { ReactComponent as GoogleIcon } from "assets/Icons/GoogleIcon.svg";
import { ReactComponent as TwitterIcon } from "assets/Icons/TwitterIcon.svg";
import YHLogo from "assets/Logos/YHLogo.svg";
import PrimaryIcon from "Components/Common/PrimaryIcon";
import clsx from "clsx";
import {
  Grid,
  Typography,
  makeStyles,
  Button,
  TextField,
  Container,
  Paper,
  CircularProgress,
  FormHelperText,
} from "Components/Common/MuiComponents";
import ForgotPassword from "Components/Auth/ForgotPassword";
import { useFormik } from "formik";
import * as yup from "yup";
import ReCAPTCHA from "react-google-recaptcha";
import { getThemeMode } from "utils/generalUtils";
import { START_LOGIN_USER } from "Actions/UserAction";
import { connect } from "react-redux";

const useStyle = makeStyles((theme) => ({
  loginRegisterWapper: {
    display: "flex",
    minHeight: "100vh",
  },
  yhLoginBody: {
    display: "flex",
    padding: "80px 0",
    flex: 1,
    position: "relative",
    backgroundImage:
      "linear-gradient(90deg," +
      theme.palette.primary.main +
      " 50%, " +
      theme.palette.background.paper +
      " 50%) !important",
    [theme.breakpoints.down("md")]: {
      backgroundImage: "none !important",
      padding: "40px 0",
    },
    [theme.breakpoints.down("sm")]: {
      padding: "30px 0",
    },
    "&:before": {
      position: "absolute",
      content: "''",
      width: "50%",
      top: 0,
      bottom: 0,
      left: 0,
      background: `url(${YHLogo}) -40px 320px`,
      backgroundSize: "auto 110%",
      backgroundRepeat: "no-repeat",
      mixBlendMode: "soft-light",
      opacity: 0.7,
      [theme.breakpoints.down("md")]: {
        display: "none",
      },
    },
  },
  yhLoginBodyLeft: {
    "&>div": {
      maxWidth: "540px",
      margin: "0 auto",
      "& > svg": {
        width: "350px",
        height: "105px",
        marginBottom: 20,
      },
    },
    [theme.breakpoints.down("md")]: {
      display: "none",
    },
  },
  yhLoginForm: {
    display: "flex",
    flexDirection: "column !important",
    marginTop: "10px",
    maxWidth: "390px",
    "&>div": {
      marginTop: "20px",
    },
    "&>a": {
      marginTop: "5px",
      marginLeft: "auto",
      color: theme.palette.primary.main,
    },
  },
  yhSignupText: {
    marginTop: "15px !important",
    textAlign: "center",
    cursor: "pointer",
  },
  yhLoginButton: {
    height: "50px !important",
    borderRadius: "10px !important",
    fontSize: "16px !important",
    marginTop: "15px !important",
  },
  yhLoginSocialGrp: {
    marginTop: "5px !important",
    width: "100%",
    "&>button": {
      marginTop: "15px !important",
      "&.twitter": {
        background: `${theme.palette.primary.main} !important`,
      },
    },
  },
  yhLoginSocialBtn: {
    borderRadius: "30px !important",
    boxShadow: "none !important",
    background: `#4285F4 !important`,
    padding: "8px 20px !important",
    textTransform: "none !important",
    height: "50px !important",
    fontSize: "16px !important",
    width: "100%",
    position: "relative",
    "&>span": {
      position: "absolute",
      left: "20px",
    },
  },
  fullWidthContainer: {
    maxWidth: "1440px !important",
    padding: "0 15px !important",
    "& > div": {
      [theme.breakpoints.down("md")]: {
        justifyContent: "center",
      },
    },
  },
  formWrapper: {
    maxWidth: "390px",
    margin: "0 auto",
  },
  yhLoginFormOR: {
    marginTop: "10px !important",
    width: "100% !important",
    "&>p": {
      textAlign: "center",
      position: "relative",
      "&:before": {
        top: "50%",
        width: "80%",
        height: "1px",
        content: "''",
        position: "absolute",
        transform: "translate(-50%,-50%)",
        left: "50%",
        backgroundColor: `${theme.palette.secondary.main}`,
      },
      "&>span": {
        padding: "0 5px",
        position: "relative",
        backgroundColor: `${theme.palette.background.paper}`,
        color: `${theme.palette.secondary.main}`,
      },
    },
  },
  loginTabContent: {
    display: "none",
    marginBottom: "40px",
    [theme.breakpoints.down("md")]: {
      display: "block",
    },
    "& svg": {
      width: "200px",
      height: "75px",
    },
    "& p": {
      fontSize: "16px",
    },
  },
}));

const Login = (props) => {
  const { loginUserAction, loginData } = props;
  const classes = useStyle();

  const navigate = useNavigate();
  let reCaptchRef = useRef(null);
  const [reCaptchValue, setReCaptchValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loginData?.error?.message && Object.keys(loginData?.error).length) {
      setError(loginData?.error?.message);
    }
  }, [loginData]);

  const handleReCaptchChange = (value) => {
    setReCaptchValue(value);
  };

  const handleLogin = (formValue) => {
    let payload = {
      email: formValue?.email || "",
      password: formValue?.password || "",
    };
    loginUserAction(payload);
  };

  const loginSchema = yup.object().shape({
    email: yup
      .string("Must be string")
      .required("Email is required field.")
      .email("Email must be valid."),
    password: yup
      .string("Must be string")
      .required("Password is required field.")
      .min(8, "Password length should be atleast 8 characters."),
  });

  const { handleSubmit, handleBlur, handleChange, values, errors, touched } =
    useFormik({
      initialValues: {
        email: "",
        password: "",
      },
      validationSchema: loginSchema,
      onSubmit: handleLogin,
      enableReinitialize: true,
    });
  return (
    <Grid className={classes.loginRegisterWapper} direction="column">
      <PrivacyPolicy />
      <Paper elevation={0} className={classes.yhLoginBody}>
        <Container className={classes.fullWidthContainer}>
          <Grid container spacing={0}>
            <Grid item md={6} className={classes.yhLoginBodyLeft}>
              <Grid>
                <MainLogoWhite />
                <Typography variant="h2" color="white">
                  Sign up for exclusive access to yumy content from your
                  favorite creators
                </Typography>
              </Grid>
            </Grid>
            <Grid item md={6} className={classes.yhLoginBodyRight}>
              <Grid className={classes.formWrapper}>
                <Grid className={classes.loginTabContent}>
                  <MainLogo />
                  <Typography variant="body1" color="black">
                    Sign up for exclusive access to yumy content from your
                    favorite creators
                  </Typography>
                </Grid>
                <Typography variant="h1" semiBold>
                  Log in
                </Typography>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                  className={classes.yhLoginForm}
                >
                  <TextField
                    autoFocus
                    required
                    name="email"
                    label="Email"
                    placeholder="Enter your email"
                    value={values.email}
                    onChange={(e) => {
                      handleChange(e);
                      setError("");
                    }}
                    error={touched.email && errors.email}
                    helperText={touched.email && errors.email}
                  />
                  <TextField
                    name="password"
                    required
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter you password"
                    value={values.password}
                    onChange={(e) => {
                      handleChange(e);
                      setError("");
                    }}
                    error={touched.password && errors.password}
                    helperText={touched.password && errors.password}
                    handleEndIcon={() => setShowPassword(!showPassword)}
                    endIcon={EyeIcon}
                  />
                  <FormHelperText error={error}>{error}</FormHelperText>

                  <Link to={""} onClick={() => setOpen(true)}>
                    Forgot password?
                  </Link>
                  <ReCAPTCHA
                    theme={getThemeMode()}
                    sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                    ref={reCaptchRef}
                    onChange={handleReCaptchChange}
                    style={{ marginLeft: "auto", marginRight: "auto" }}
                  />
                  <Button
                    variant="contained"
                    type="submit"
                    className={classes.yhLoginButton}
                    disabled={!reCaptchValue}
                    startIcon={
                      loginData?.isLoading && (
                        <CircularProgress size="20px" color="white" />
                      )
                    }
                  >
                    Login
                  </Button>
                  <Typography
                    variant="body1"
                    color="primary"
                    onClick={() => navigate("/signup")}
                    className={classes.yhSignupText}
                  >
                    Sign up for YumyHub
                  </Typography>
                  <Grid className={classes.yhLoginFormOR}>
                    <Typography variant="body1" color="grey50">
                      <span>OR</span>
                    </Typography>
                  </Grid>
                  <Grid className={classes.yhLoginSocialGrp}>
                    <Button
                      variant="contained"
                      startIcon={
                        <PrimaryIcon icon={GoogleIcon} color="white" />
                      }
                      className={classes.yhLoginSocialBtn}
                    >
                      Continue with Google
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={
                        <PrimaryIcon icon={TwitterIcon} color="white" />
                      }
                      className={clsx(classes.yhLoginSocialBtn, "twitter")}
                    >
                      Continue with Twitter
                    </Button>
                  </Grid>
                </form>
              </Grid>
            </Grid>
          </Grid>
        </Container>
      </Paper>
      <Footer />
      <ForgotPassword open={open} handleClose={() => setOpen(false)} />
    </Grid>
  );
};

const mapStateToProps = (state) => ({
  loginData: state.user.loginDetail,
});
const mapDispatchToProps = (dispatch) => ({
  loginUserAction: (payload) => dispatch({ type: START_LOGIN_USER, payload }),
});

export default connect(mapStateToProps, mapDispatchToProps)(Login);
