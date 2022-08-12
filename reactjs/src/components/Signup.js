import React, { useEffect, useRef, useState } from "react";
import PrivacyPolicy from "Components/Common/PrivacyPolicy";
import Footer from "Components/Common/Footer";
import { ReactComponent as MainLogoWhite } from "assets/Logos/MainLogoWhite.svg";
import { ReactComponent as MainLogo } from "assets/Logos/MainLogo.svg";
import { useNavigate } from "react-router-dom";
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
import { useFormik } from "formik";
import * as yup from "yup";
import ReCAPTCHA from "react-google-recaptcha";
import { getThemeMode } from "utils/generalUtils";
import { connect } from "react-redux";
import { START_REGISTER_USER } from "Actions/UserAction";

const useStyle = makeStyles((theme) => ({
  loginRegisterWapper: {
    display: "flex",
    minHeight: "100vh",
  },
  yhSignupBody: {
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
  yhSignupBodyLeft: {
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
  yhSignupForm: {
    display: "flex",
    flexDirection: "column !important",
    marginTop: "10px",
    maxWidth: "390px",
    "&>div": {
      marginTop: "20px",
    },
  },
  yhSignPrivacyText: {
    marginTop: "20px !important",
    textAlign: "center",
    "&>span": {
      color: theme.palette.primary.main,
      fontWeight: "600",
      cursor: "pointer",
    },
  },
  yhLoginText: {
    marginTop: "20px !important",
    textAlign: "center",
    color: `${theme.palette.black.main} !important`,
    "&>span": {
      color: theme.palette.primary.main,
      fontWeight: "500",
      cursor: "pointer",
    },
  },
  yhSignupButton: {
    height: "50px !important",
    borderRadius: "10px !important",
    fontSize: "16px !important",
    marginTop: "30px !important",
  },
  yhSignupSocialGrp: {
    marginTop: "5px !important",
    width: "100%",
    "&>button": {
      marginTop: "15px !important",
      "&.twitter": {
        background: `${theme.palette.primary.main} !important`,
      },
    },
  },
  yhSingupSocialBtn: {
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
  yhSignupformWrapper: {
    maxWidth: "390px",
    margin: "0 auto",
  },
  yhSignupFormOR: {
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
  yhSignUpTabContent: {
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

const Signup = (props) => {
  const { registerData, registerUserAction } = props;
  const classes = useStyle();

  const navigate = useNavigate();
  let reCaptchRef = useRef(null);
  const [reCaptchValue, setReCaptchValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleReCaptchChange = (value) => {
    setReCaptchValue(value);
  };

  useEffect(() => {
    if (
      registerData?.error?.message &&
      Object.keys(registerData?.error).length
    ) {
      setError(registerData?.error?.message);
    }
  }, [registerData]);

  const handleSignup = (formValue) => {
    let payload = {
      name: formValue?.name || "",
      email: formValue?.email || "",
      password: formValue?.password || "",
    };
    registerUserAction(payload);
  };

  const signupSchema = yup.object().shape({
    name: yup
      .string("Must be string")
      .required("Name is required field.")
      .min(4, "Name length must be atleast 4 characters long."),
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
        name: "",
        email: "",
        password: "",
      },
      validationSchema: signupSchema,
      onSubmit: handleSignup,
      enableReinitialize: true,
    });

  return (
    <Grid className={classes.loginRegisterWapper} direction="column">
      <PrivacyPolicy />
      <Paper elevation={0} className={classes.yhSignupBody}>
        <Container className={classes.fullWidthContainer}>
          <Grid container spacing={0}>
            <Grid item md={6} className={classes.yhSignupBodyLeft}>
              <Grid>
                <MainLogoWhite />
                <Typography variant="h2" color="white">
                  Sign up for exclusive access to yumy content from your
                  favorite creators
                </Typography>
              </Grid>
            </Grid>
            <Grid item md={6} className={classes.yhLoginBodyRight}>
              <Grid className={classes.yhSignupformWrapper}>
                <Grid className={classes.yhSignUpTabContent}>
                  <MainLogo />
                  <Typography variant="body1" color="black">
                    Sign up for exclusive access to yumy content from your
                    favorite creators
                  </Typography>
                </Grid>
                <Typography variant="h1" color="black" semiBold>
                  Create Account
                </Typography>
                <form
                  className={classes.yhSignupForm}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                >
                  <TextField
                    name="name"
                    required
                    label="Name"
                    placeholder="Enter your name"
                    autoFocus
                    value={values.name}
                    onChange={(e) => {
                      handleChange(e);
                      setError("");
                    }}
                    error={touched.name && errors.name}
                    helperText={touched.name && errors.name}
                  />
                  <TextField
                    name="email"
                    required
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
                    endIcon={EyeIcon}
                    handleEndIcon={() => setShowPassword(!showPassword)}
                  />
                  <FormHelperText error={error}>{error}</FormHelperText>
                  <ReCAPTCHA
                    theme={getThemeMode()}
                    sitekey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}
                    ref={reCaptchRef}
                    onChange={handleReCaptchChange}
                    style={{ marginLeft: "auto", marginRight: "auto" }}
                  />
                  <Button
                    variant="contained"
                    className={classes.yhSignupButton}
                    type="submit"
                    disabled={!reCaptchValue}
                    startIcon={
                      registerData?.isLoading && (
                        <CircularProgress size="20px" color="white" />
                      )
                    }
                  >
                    Create Account
                  </Button>
                  <Typography
                    variant="body2"
                    color="black"
                    className={classes.yhSignPrivacyText}
                  >
                    By signing up you agree to our{" "}
                    <span> Terms of Service </span> and{" "}
                    <span> Privacy Policy </span>, and confirm that you are at
                    least 18 years old.
                  </Typography>
                  <Typography
                    variant="body1"
                    color="primary"
                    className={classes.yhLoginText}
                  >
                    Already Have an Account?{" "}
                    <span onClick={() => navigate("/login")}> Login </span>
                  </Typography>
                  <Grid className={classes.yhSignupFormOR}>
                    <Typography variant="body1" color="grey50">
                      <span>OR</span>
                    </Typography>
                  </Grid>
                  <Grid className={classes.yhSignupSocialGrp}>
                    <Button
                      variant="contained"
                      startIcon={
                        <PrimaryIcon icon={GoogleIcon} color="white" />
                      }
                      className={classes.yhSingupSocialBtn}
                    >
                      Continue with Google
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={
                        <PrimaryIcon icon={TwitterIcon} color="white" />
                      }
                      className={clsx(classes.yhSingupSocialBtn, "twitter")}
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
    </Grid>
  );
};

const mapStateToProps = (state) => ({
  registerData: state.user.registerDetail,
});
const mapDispatchToProps = (dispatch) => ({
  registerUserAction: (payload) =>
    dispatch({ type: START_REGISTER_USER, payload }),
});

export default connect(mapStateToProps, mapDispatchToProps)(Signup);
