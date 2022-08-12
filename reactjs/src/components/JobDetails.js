/* eslint-disable jsx-a11y/iframe-has-title */
/* eslint-disable array-callback-return */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable eqeqeq */
import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import clsx from "clsx";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";
import {
  Paper,
  Button,
  Avatar,
  Dialog,
  DialogTitle,
  Grid,
  DialogContent,
  CircularProgress,
} from "@material-ui/core/";
import {
  START_GET_SKILLS_LIST,
  START_GET_CAPABILITIES_LIST,
} from "../../actions/user_profile";
import {
  START_CREATE_NEW_JOB,
  EMPTY_JOB_INIT_STATE,
  START_GET_JOB_RECOMMENDATION_USER,
  START_GET_JOB_SORT_LINK,
  START_SAVE_JOB,
  START_JOB_UNIQUE_ACTION,
} from "../../actions/job";
import { START_USER_PROFILE_SCORE } from "../../actions/myprofile";
import AvatarUser from "react-avatar";
import { Skeleton } from "@material-ui/lab";
import { ReactComponent as CloseChipIcon } from "../../assets/CloseChipIcon.svg";
import ReactPlayer from "react-player";
import Slider from "infinite-react-carousel";
import { NotificationManager } from "react-notifications";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import ReactHtmlParser from "react-html-parser";
import { ReactComponent as DocumentIcon } from "../../assets/DocumentIcon.svg";
import { ReactComponent as PhotoVideoIcon } from "../../assets/PhotoVideoIcon.svg";
import { ReactComponent as VideoIconGrey } from "../../assets/VideoIconGrey.svg";
import { ReactComponent as AudioIcon } from "../../assets/AudioIcon.svg";
import ProfilePicture from "../../assets/ProfilePicture.png";

import {
  mixpanelEventStore,
  customerioEventStore,
  replaceAllString,
  encryptedData,
} from "../../utils/customHooks";

const ShareJobDialog = React.lazy(() => import("./ShareJobDialog"));
const ReferJobDialog = React.lazy(() => import("./ReferJobDialog"));
const ApplyJobDialog = React.lazy(() => import("./ApplyJobDialog"));
const ShareJob = React.lazy(() => import("./ShareJob"));
const JobApplicationsListBox = React.lazy(() =>
  import("./JobApplicationsListBox")
);
const JobChips = React.lazy(() => import("./JobChips"));
const SecondaryButton = React.lazy(() =>
  import("../commonComponents/SecondaryButton")
);
const PrimaryButton = React.lazy(() =>
  import("../commonComponents/PrimaryButton")
);

const ExtendJobApplicationDialog = React.lazy(() =>
  import("./ExtendJobApplicationDialog")
);
const MarkCompleteDialoge = React.lazy(() => import("./MarkCompleteDialoge"));

const getSymbolFromCurrency = require("currency-symbol-map");
var nl2br = require("nl2br");

const useSkeletonClasses = makeStyles((theme) => ({
  recentContactsSkeletonRoot: {
    display: "flex",
    padding: "15px 10px",
    width: "95%",
    alignItems: "center",
  },
  userNameSkeleton: {
    flexGrow: 1,
    paddingLeft: 5,
    width: "100%",
  },
  DescriptionReting: {
    height: 120,
    margin: "0px 30px",
  },
  DescriptionRetingCls: {
    width: "100%",
  },
}));

function SkeletonJobDetails({ className }) {
  const classes = useSkeletonClasses();
  return (
    <div className={classes.recentContactsSkeletonRoot}>
      <div className={classes.userNameSkeleton}>
        <Skeleton variant="text" height={50} width={170} />
        <Skeleton variant="text" height={20} width={250} />
        <Skeleton variant="text" height={20} width={300} />
      </div>
    </div>
  );
}

function SkeletonUserDetails({ className }) {
  const classes = useSkeletonClasses();
  return (
    <div className={classes.recentContactsSkeletonRoot}>
      <Skeleton
        variant="circle"
        width={100}
        height={80}
        style={{ marginRight: 15 }}
      />
      <div className={classes.userNameSkeleton}>
        <Skeleton variant="text" height={40} width={150} />
        <Skeleton variant="text" height={25} width={250} />
        <Skeleton variant="text" height={25} width={150} />
      </div>
    </div>
  );
}

function SkeletonDescription({ className }) {
  const classes = useSkeletonClasses();
  return (
    <div>
      <div className={classes.DescriptionRetingCls}>
        <Skeleton variant="text" className={classes.DescriptionReting} />
      </div>
    </div>
  );
}

const useClasses = makeStyles((theme) => ({
  boxShadow: {
    boxShadow: "none",
  },
  JobDetailsRoot: {
    height: "auto",
    display: "block",
    margin: "auto",
  },
  JobDetailsBoxCls: {
    border: "1px solid #E9EEF7",
    marginBottom: 25,
    width: "100%",
    boxSizing: "border-box",
    paddingTop: 15,
    [theme.breakpoints.down("xs")]: {
      marginBottom: "0px",
    },
  },
  JobDetailsBoxItem: {
    padding: "0px 30px",
    [theme.breakpoints.down("xs")]: {
      padding: "0px 10px",
    },
    "&>p": {
      lineHeight: "25px",
      color: "#A4A8AB",
      fontWeight: 500,
      "&:nth-of-type(1)": {
        margin: "8px 0px 10px 0px",
        fontSize: 18,
        [theme.breakpoints.down("xs")]: {
          fontSize: 15,
          margin: "3px 0px 0px 0px",
        },
      },
      "&:nth-of-type(2)": {
        margin: 0,
        display: "flex",
        alignItems: "center",
        fontSize: 18,
        [theme.breakpoints.down("xs")]: {
          fontSize: 15,
        },
        "&>span": {
          "&:nth-of-type(1)": {
            color: "#FA002D",
            // marginRight: 5,
          },
          "&:nth-of-type(2)": {
            color: "#3AA3F9",
            // marginLeft: 5,
            display: "flex",
            alignItems: "center",
            "&>svg": {
              width: 15,
              height: 15,
              marginLeft: 10,
              cursor: "pointer",
            },
          },
        },
      },
    },
    "&>div": {
      display: "flex",
      flexWrap: "wrap",
      marginTop: 10,
      "&>div": {
        fontSize: "16px !important",
        fontWeight: 500,
        [theme.breakpoints.down("xs")]: {
          fontSize: "15px !important",
        },
      },
    },
  },
  JobDescroptionBoxCls: {
    border: "1px solid #E9EEF7",
    padding: "15px 30px",
    marginBottom: 25,
    width: "100%",
    boxSizing: "border-box",
    "&>h5": {
      fontSize: 20,
      margin: 0,
    },
    "&>p": {
      marginBottom: 0,
      fontSize: 16,
      "&>p": {
        margin: "0px auto",
      },
    },
    [theme.breakpoints.down("xs")]: {
      padding: "10px 10px",
    },
  },
  JobUserDetailsBoxCls: {
    border: "1px solid #E9EEF7",
    padding: "15px 30px",
    marginBottom: 25,
    width: "100%",
    boxSizing: "border-box",
    "&>h5": {
      fontSize: 20,
      margin: 0,
    },
    "&>div": {
      display: "flex",
      marginTop: 15,
      alignItems: "flex-start",
      "&>div": {
        "&:nth-of-type(2)": {
          "&>h3": {
            margin: 0,
            marginBottom: 5,
            fontSize: 25,
            [theme.breakpoints.down("xs")]: {
              lineHeight: 1.2,
            },
          },
          "&>p": {
            margin: 0,
            lineHeight: "23px",
            [theme.breakpoints.down("xs")]: {
              lineHeight: 1,
            },
          },
        },
      },
    },
    [theme.breakpoints.down("xs")]: {
      padding: "10px 10px",
    },
  },
  userProfileImage: {
    borderRadius: "50%",
    width: 150,
    height: 150,
    position: "relative",
    marginRight: 25,
    [theme.breakpoints.down(1480)]: {
      width: 120,
      height: 120,
    },
    [theme.breakpoints.down("xs")]: {
      marginRight: 15,
      width: 100,
      height: 100,
    },
  },
  userAvatarPostCreate: {
    width: "155px",
    height: "155px",
    borderRadius: "50%",
    display: "flex",
    margin: "auto",
    [theme.breakpoints.down(1480)]: {
      width: 120,
      height: 120,
    },
    [theme.breakpoints.down("xs")]: {
      width: 100,
      height: 100,
    },
    "&>img": {
      width: "100%",
      margin: "auto",
      position: "absolute",
      height: "auto",
      top: 0,
      left: 0,
      bottom: 0,
    },
  },
  userAvatarPostCreatePrivate: {
    width: "155px",
    height: "155px",
    marginRight: 5,
    borderRadius: "50%",
    display: "flex",
    margin: "auto",
    [theme.breakpoints.down(1480)]: {
      width: 120,
      height: 120,
    },
    [theme.breakpoints.down("xs")]: {
      width: 100,
      height: 100,
    },
    [theme.breakpoints.down("xs")]: {
      width: "100px !important",
      height: "100px !important",
    },
    "&>img": {
      width: "95%",
      margin: "auto",
      position: "inherit",
      height: "auto",
      top: 0,
      left: 0,
      bottom: 0,
    },
  },
  peopleDefaultUserIcon: {
    width: "155px !important",
    height: "155px !important",
    display: "inline-block",
    right: 10,
    borderRadius: "50%",
    [theme.breakpoints.down("xs")]: {
      width: "120px !important",
      height: "120px !important",
    },
    [theme.breakpoints.down("xs")]: {
      width: "100px !important",
      height: "100px !important",
    },
  },
  userLineOfWorkCls: {
    color: "#FA6017",
    margin: 0,
    fontWeight: 500,
    fontSize: 18,
    [theme.breakpoints.down("xs")]: {
      fontSize: 15,
      lineHeight: 1,
    },
  },
  userLocationCls: {
    color: "#3AA3F9",
    fontSize: 18,
    fontWeight: 500,
    margin: "10px 0px !important",
    [theme.breakpoints.down("xs")]: {
      fontSize: 15,
      margin: "8px 0px !important",
    },
  },
  userProfileLink: {
    display: "flex",
    alignItems: "center",
    margin: 0,
    marginTop: 15,
    "&>span": {
      marginRight: 15,
      color: "#97979B",
      textDecoration: "none",
      alignItems: "center",
      display: "flex",
      fontWeight: 500,
      fontSize: 18,
      cursor: "pointer",
      [theme.breakpoints.down("xs")]: {
        fontSize: 15,
      },
      "&>img": {
        width: 21,
        marginRight: 6,
      },
    },
  },
  jobSkillsBoxCls: {
    display: "flex",
    flexWrap: "wrap",
    marginTop: 10,
    "&>div": {
      fontSize: "20px !important",
      [theme.breakpoints.down(1480)]: {
        fontSize: "18px !important",
      },
      [theme.breakpoints.down("xs")]: {
        fontSize: "15px !important",
      },
    },
  },
  jobMainTitle: {
    display: "flex",
    justifyContent: "space-between",
    padding: "0px 30px",
    [theme.breakpoints.down("xs")]: {
      padding: "0px 10px",
    },
    "&>h4": {
      color: "#FA6017",
      fontWeight: 700,
      fontSize: 18,
      margin: 0,
      lineHeight: 1,
      textTransform: "capitalize",
      [theme.breakpoints.down("sm")]: {
        fontSize: 18,
      },
    },
  },

  attachmentsCls: {
    display: "flex",
    flexDirection: "column",
    marginTop: 10,
    "&>span": {
      display: "flex",
      alignItems: "center",
      margin: "7px 0px",
      cursor: "pointer",
      fontSize: 20,
      [theme.breakpoints.down(1480)]: {
        fontSize: 18,
      },
      [theme.breakpoints.down("xs")]: {
        fontSize: 15,
      },
      "&>svg": {
        width: 21,
        height: 21,
        marginRight: 10,
      },
      "&>span": {
        [theme.breakpoints.down("xs")]: {
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        },
      },
    },
  },
  postImgDialog: {
    width: "520px !important",
    height: "auto",
    maxHeight: "calc(100vh - 150px)",
    [theme.breakpoints.down("xs")]: {
      maxWidth: "95%",
    },
  },
  dialogTitleRoot: {
    padding: 0,
  },
  modalCloseBtn: {
    display: "flex",
    paddingLeft: 8,
    paddingRight: 8,
    margin: "7px 0px",
  },
  closeIconButton: {
    minWidth: "unset",
    padding: 0,
    alignSelf: "flex-start",
    marginRight: 0,
    marginLeft: "auto",
    color: "#26262D",
    "&:hover": {
      backgroundColor: "unset",
    },
  },
  rootDialogContentImg: {
    padding: "0px 0px",
    marginBottom: "10px !important",
    minHeight: 70,
    [theme.breakpoints.down("xs")]: {
      width: "95%",
      margin: "0 auto",
    },
  },
  popupAudioMainCls: {
    width: "90% !important",
    height: "50px !important",
    margin: "auto",
    [theme.breakpoints.down("xs")]: {
      textAlign: "center",
    },
    "&>audio": {
      height: "revert !important",
    },
  },
  popupVideoMainCls: {
    width: "auto",
    maxWidth: "90% !important",
    height: "auto !important",
    maxHeight: "500px !important",
    margin: "auto",
    [theme.breakpoints.down("xs")]: {
      textAlign: "center",
    },
    "&>audio": {
      height: "revert !important",
    },
  },
  rootDialogContent: {
    padding: "0px 0px",
    marginBottom: "10px !important",
    [theme.breakpoints.down("xs")]: {
      width: "95%",
      margin: "0 auto",
    },
  },
  markAsComplate: {
    [theme.breakpoints.down("xs")]: {
      lineHeight: "13px",
      width: "120px !important",
    },
  },
  defaultDivBtn: {
    width: "100%",
    marginTop: 12,
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: "#FBFAFC",
    borderTop: "1px solid #EFEFEF",
    padding: "10px 30px",
    boxSizing: "border-box",
    [theme.breakpoints.down("xs")]: {
      padding: "10px 10px",
    },
    "&>button": {
      height: "40px !important",
      width: 170,
      padding: "0px !important",
      [theme.breakpoints.down(1480)]: {
        height: "35px !important",
      },
      [theme.breakpoints.between(960, 1230)]: {
        width: 120,
      },
      [theme.breakpoints.down("xs")]: {
        width: 130,
      },
      [theme.breakpoints.down(430)]: {
        width: 90,
        height: "26px !important",
      },
      "&>span": {
        fontSize: 15,
        [theme.breakpoints.down(430)]: {
          fontSize: 13,
        },
      },
    },
  },
  editCloseIconButton: {
    padding: 0,
    marginLeft: "auto",
    marginRight: 0,
    minWidth: 18,
    "&>span": {
      "&>svg": {
        width: 18,
        height: 18,
      },
    },
    "&:hover": {
      backgroundColor: "unset",
    },
  },
  notFoundPost: {
    "&>p": {
      padding: "15px 0px",
      textAlign: "center",
    },
  },
}));

function JobDetails(props) {
  const {
    jobDetailsData = "",
    jobDetailsIsLoading,
    jobRecommendationUserAction,
    getUserProfileScrore,
    getJobSortLinkAction,
    userDetails,
    saveJobAction,
    isSaveJobLoading,
    userApplicationsList,
    userApplicationsCount,
    newUserApplicationsList,
    newUserApplicationsCount,
    jobUniqueActionWithTypeAction,
    isUniqueJobActionLoading,
    uniqueJobActionStatus,
    uniqueJobActiondSuccessMessage,
    uniqueJobActiondErrorMessage,
    emptyJobInitState,
  } = props;
  const classes = useClasses();
  const history = useHistory();
  const [openDocumentItem, setOpenDocumentItem] = useState("");
  const [openDocumentType, setOpenDocumentType] = useState("");
  const [openDocumentModal, setOpenDocumentModal] = useState(false);
  const [shareJobDialogStatus, setShareJobDialogStatus] = useState(false);
  const [referJobDialogStatus, setReferJobDialogStatus] = useState(false);
  const [applyJobStatus, setApplyJobStatus] = useState(false);
  const [ADActionStatus, setADActionStatus] = useState("");

  const [extendJobDialogStatus, setExtendJobDialogStatus] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [jobCloseDate, setjobCloseDate] = useState("");
  const [markCompleteDialoge, setMarkCompleteDialoge] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const extendJobDialogAction = (status) => {
    setExtendJobDialogStatus(status);
  };

  const showDocumentsModelAction = (data, type) => {
    if (type == "Document") {
      setOpenDocumentType(type);
      setOpenDocumentItem(data);
      setOpenDocumentModal(true);
    }
    if (type == "Image") {
      setOpenDocumentType(type);
      setOpenDocumentItem(data);
      setOpenDocumentModal(true);
    }
    if (type == "Audio") {
      setOpenDocumentType(type);
      setOpenDocumentItem(data);
      setOpenDocumentModal(true);
    }
    if (type == "Video") {
      if (data.media !== null) {
        setOpenDocumentType(type);
        setOpenDocumentItem(data.media);
        setOpenDocumentModal(true);
      } else {
        NotificationManager.error(
          "We're processing this video. you can't play now!",
          "",
          5000
        );
      }
    }
  };

  const shareJobDialogAction = (status) => {
    setShareJobDialogStatus(status);
  };

  const referJobDialogAction = (status) => {
    if (
      localStorage.getItem("token") !== "" &&
      localStorage.getItem("token") !== null
    ) {
      if (status === true) {
        jobRecommendationUserAction(jobDetailsData?.id);
        if (
          jobDetailsData?.short_url !== undefined &&
          (jobDetailsData?.short_url === null ||
            jobDetailsData?.short_url === "")
        ) {
          getJobSortLinkAction(jobDetailsData?.id);
        }
      }
      setReferJobDialogStatus(status);
    } else {
      history.push("/log-in");
    }
  };

  const applyJobDialogAction = (status) => {
    if (
      localStorage.getItem("token") !== "" &&
      localStorage.getItem("token") !== null
    ) {
      if (status === true) {
        getUserProfileScrore();
      }
      setApplyJobStatus(status);
    } else {
      history.push("/log-in");
    }
  };

  const closeApplyJobDialogAction = () => {
    setApplyJobStatus(false);
  };

  useEffect(() => {
    if (jobDetailsData !== "" && jobDetailsIsLoading === false) {
      let attribution =
        jobDetailsData?.is_owner === true
          ? "Owner Outreach"
          : window.localStorage.getItem("mixpanelJobType") !== null &&
            window.localStorage.getItem("mixpanelJobType") != ""
          ? window.localStorage.getItem("mixpanelJobType")
          : "Other";
      let mixData = {
        job_id: jobDetailsData?.id,
        from_referral: jobDetailsData?.job_refer !== null ? true : false,
        job_referrer:
          jobDetailsData?.job_refer !== null
            ? jobDetailsData?.job_refer?.refer_sent_user_id
            : "-",
        from_share: jobDetailsData?.post !== null ? true : false,
        job_sharer:
          jobDetailsData?.post !== null ? jobDetailsData?.post?.user_id : "-",
        external_job: jobDetailsData?.is_scraper == 1 ? true : false,
        attribution: attribution,
      };

      mixpanelEventStore("Viewed Job", mixData);
      customerioEventStore(
        "trackData",
        userDetails.id,
        "",
        "Viewed Job",
        mixData
      );

      const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
      if (jobDetailsData?.publish_date !== null) {
        var secondDate = new Date(jobDetailsData?.publish_date);
        secondDate.setDate(
          secondDate.getDate() + jobDetailsData?.day_application_close
        );
        setjobCloseDate(secondDate);
        const diffDays = Math.round(
          Math.abs((new Date() - secondDate) / oneDay)
        );

        setDaysRemaining(diffDays);
      }
    }
  }, [jobDetailsData]);

  const userSaveJobAction = (jobData) => {
    let data = {
      job_id: jobData?.id,
      job_user_id: jobData?.user?.id,
    };
    saveJobAction(data);
  };

  const handleShareJob = (jobData) => {
    setShowShareDialog(true);
  };

  const jobUpdateAction = (status) => {
    setADActionStatus(status);
    jobUniqueActionWithTypeAction(status, jobDetailsData?.id);
  };

  useEffect(() => {
    if (uniqueJobActiondErrorMessage !== "") {
      NotificationManager.error(uniqueJobActiondErrorMessage, "", 5000);
      emptyJobInitState("uniqueJobActiondErrorMessage", "");
    }
  }, [uniqueJobActiondErrorMessage]);

  useEffect(() => {
    if (
      uniqueJobActiondSuccessMessage !== "" &&
      uniqueJobActionStatus === true
    ) {
      NotificationManager.success(uniqueJobActiondSuccessMessage, "", 5000);
      emptyJobInitState("uniqueJobActionStatus", false);
      emptyJobInitState("uniqueJobActiondSuccessMessage", "");
      if (ADActionStatus == "delete") {
        history.push(`/jobs`);
      }
      setADActionStatus("");
    }
  }, [uniqueJobActiondSuccessMessage]);

  return (
    <>
      {!jobDetailsIsLoading && jobDetailsData?.id === undefined ? (
        <Paper
          className={clsx(
            classes.paper,
            classes.boxShadow,
            classes.notFoundPost
          )}
        >
          <p>Job Not Found</p>
        </Paper>
      ) : (
        <div className={classes.JobDetailsRoot}>
          <Paper className={clsx(classes.boxShadow, classes.JobDetailsBoxCls)}>
            {jobDetailsIsLoading && <SkeletonJobDetails />}
            {!jobDetailsIsLoading && (
              <>
                <div className={classes.jobMainTitle}>
                  <h4>{jobDetailsData?.title}</h4>
                  <Button
                    className={classes.editCloseIconButton}
                    color="primary"
                    onClick={() => window.history.go(-1)}
                  >
                    <CloseChipIcon />
                  </Button>
                </div>
                <div className={classes.JobDetailsBoxItem}>
                  <p>
                    {jobDetailsData?.city !== null &&
                      jobDetailsData?.city !== undefined &&
                      `${jobDetailsData?.city}, `}
                    {jobDetailsData?.state !== null &&
                      jobDetailsData?.state !== undefined &&
                      `${jobDetailsData?.state}, `}
                    {jobDetailsData?.country !== null &&
                      jobDetailsData?.country !== undefined &&
                      `${jobDetailsData?.country}`}{" "}
                    |{" "}
                    {jobDetailsData?.frequency === "n/a"
                      ? ""
                      : jobDetailsData?.frequency}
                  </p>
                  <p>
                    {jobDetailsData?.pay_amount &&
                      jobDetailsData?.pay_amount !== null &&
                      jobDetailsData?.pay_amount !== "" && (
                        <>
                          <span>
                            {getSymbolFromCurrency(
                              jobDetailsData?.pay_currency
                            )}
                            {jobDetailsData?.pay_amount}{" "}
                            {jobDetailsData?.to_pay_amount &&
                              jobDetailsData?.to_pay_amount !== null &&
                              jobDetailsData?.to_pay_amount !== "" &&
                              `- ${getSymbolFromCurrency(
                                jobDetailsData?.pay_currency
                              )}${jobDetailsData?.to_pay_amount}`}{" "}
                            {jobDetailsData?.pay_time == "select pay time"
                              ? ""
                              : jobDetailsData?.pay_time}
                          </span>
                          &nbsp;|&nbsp;
                        </>
                      )}
                    <span>
                      {jobDetailsData?.publish_date !== null &&
                      new Date(jobCloseDate) >= new Date()
                        ? `Applications close in ${daysRemaining} days`
                        : "Applications closed"}{" "}
                    </span>
                  </p>
                  <div>
                    {jobDetailsData?.job_capabilities &&
                      jobDetailsData?.job_capabilities.map((iteam, key) => (
                        <JobChips
                          iteamTitle={iteam?.global_capability?.capability}
                        />
                      ))}
                  </div>
                </div>
                <div className={classes.defaultDivBtn}>
                  {jobDetailsData?.is_publish == 1 && (
                    <SecondaryButton
                      variant="contained"
                      color="orange"
                      children="Share"
                      onClick={() => handleShareJob(jobDetailsData)}
                    />
                  )}
                  {jobDetailsData?.is_publish == 0 &&
                    jobDetailsData?.is_owner == true && (
                      <SecondaryButton
                        variant="contained"
                        color="orange"
                        children="Delete"
                        onClick={() => jobUpdateAction("delete")}
                        ADActionStatus
                        startIcon={
                          isUniqueJobActionLoading &&
                          ADActionStatus == "delete" && (
                            <CircularProgress size="18px" color="#fff" />
                          )
                        }
                      />
                    )}

                  {jobDetailsData?.is_publish == 1 &&
                    jobDetailsData?.is_owner == true &&
                    jobDetailsData?.is_complete == 0 && (
                      <PrimaryButton
                        variant="contained"
                        color="aqua"
                        children={"Mark Complete"}
                        onClick={() => setMarkCompleteDialoge(true)}
                        disabled={jobDetailsData?.is_complete == 1}
                        className={classes.markAsComplate}
                      />
                    )}

                  {jobDetailsData?.is_publish == 0 &&
                    jobDetailsData?.is_owner == true &&
                    jobDetailsData?.is_complete != 1 && (
                      <PrimaryButton
                        variant="contained"
                        color="aqua"
                        children={"Publish"}
                        onClick={() => jobUpdateAction("publish")}
                        disabled={jobDetailsData?.is_complete == 1}
                        startIcon={
                          isUniqueJobActionLoading &&
                          ADActionStatus == "publish" && (
                            <CircularProgress size="18px" color="#fff" />
                          )
                        }
                      />
                    )}

                  {jobDetailsData?.is_owner === false && (
                    <PrimaryButton
                      variant="contained"
                      color="aqua"
                      children={
                        jobDetailsData?.is_apply === true ? "Applied" : "Apply"
                      }
                      onClick={() =>
                        history.push(
                          `/job-apply/${encryptedData(jobDetailsData?.id)}`
                        )
                      }
                      disabled={
                        jobDetailsData?.is_apply ||
                        jobDetailsData?.publish_date == null ||
                        new Date(jobCloseDate) <= new Date() ||
                        (jobDetailsData?.is_complete == 1 &&
                          jobCloseDate <= new Date())
                      }
                    />
                  )}
                  {jobDetailsData?.is_owner === false && (
                    <SecondaryButton
                      variant="contained"
                      color="orange"
                      children="Save"
                      onClick={() => userSaveJobAction(jobDetailsData)}
                      disabled={isSaveJobLoading}
                      startIcon={
                        isSaveJobLoading && (
                          <CircularProgress size="15px" color="#FA6017" />
                        )
                      }
                    />
                  )}
                  {jobDetailsData?.is_publish == 1 &&
                    jobDetailsData?.is_owner === true && (
                      <SecondaryButton
                        variant="contained"
                        color="orange"
                        children="Extend"
                        onClick={() => extendJobDialogAction(true)}
                        disabled={
                          jobDetailsData?.is_complete != 0 ||
                          jobCloseDate <= new Date()
                        }
                      />
                    )}

                  {jobDetailsData?.is_publish == 0 &&
                    jobDetailsData?.is_owner === true && (
                      <SecondaryButton
                        variant="contained"
                        color="orange"
                        children="Edit"
                        onClick={() =>
                          history.push(
                            `/edit-job/${encryptedData(jobDetailsData?.id)}`
                          )
                        }
                        disabled={isSaveJobLoading}
                      />
                    )}
                </div>
              </>
            )}
          </Paper>

          {jobDetailsData?.is_owner && (
            <>
              {newUserApplicationsList.length > 0 && (
                <JobApplicationsListBox
                  jobValue={jobDetailsData}
                  boxType="new"
                  applicationsList={newUserApplicationsList}
                  applicationsCount={newUserApplicationsCount}
                />
              )}
              {userApplicationsList.length > 0 && (
                <JobApplicationsListBox
                  jobValue={jobDetailsData}
                  boxType="old"
                  applicationsList={userApplicationsList}
                  applicationsCount={userApplicationsCount}
                />
              )}
            </>
          )}
          <Paper
            className={clsx(classes.boxShadow, classes.JobDescroptionBoxCls)}
          >
            <h5>Job Description</h5>

            {jobDetailsIsLoading == true && <SkeletonDescription />}
            {!jobDetailsIsLoading && (
              <p>
                {jobDetailsData?.description !== null &&
                  ReactHtmlParser(
                    nl2br(
                      replaceAllString(
                        jobDetailsData?.description,
                        "\n\n<",
                        "\n<"
                      )
                    )
                  )}
              </p>
            )}
          </Paper>

          <Paper
            className={clsx(classes.boxShadow, classes.JobUserDetailsBoxCls)}
          >
            <h5>Employer</h5>
            {jobDetailsIsLoading == true && <SkeletonUserDetails />}
            {!jobDetailsIsLoading == true && (
              <div>
                <div className={classes.userProfileImage}>
                  {jobDetailsData?.user?.profile != null && (
                    <div>
                      <Avatar
                        className={classes.userAvatarPostCreate}
                        alt={jobDetailsData?.user?.name}
                        src={jobDetailsData?.user?.profile}
                      />
                    </div>
                  )}

                  {jobDetailsData?.user === null && (
                    <div>
                      <Avatar
                        className={classes.userAvatarPostCreatePrivate}
                        alt={jobDetailsData?.user?.name}
                        src={ProfilePicture}
                      />
                    </div>
                  )}

                  {jobDetailsData?.user?.profile == null &&
                    jobDetailsData?.user && (
                      <div>
                        <AvatarUser
                          color="#97979B"
                          title={jobDetailsData?.user?.name}
                          name={jobDetailsData?.user?.name}
                          className={classes.peopleDefaultUserIcon}
                        />
                      </div>
                    )}
                </div>
                <div>
                  <h3>
                    {jobDetailsData?.user_id === null ||
                    jobDetailsData?.user === null
                      ? "Private Employer"
                      : jobDetailsData?.user?.name}
                  </h3>
                  <p className={classes.userLineOfWorkCls}>
                    {jobDetailsData?.user?.capabilities &&
                      jobDetailsData?.user?.capabilities.map((capability, i) =>
                        i == "0"
                          ? capability.cpb_name
                          : ` | ${capability.cpb_name}`
                      )}
                  </p>
                  <p className={classes.userLocationCls}>
                    {jobDetailsData?.city !== null &&
                      jobDetailsData?.city !== undefined &&
                      `${jobDetailsData?.city}, `}
                    {jobDetailsData?.state !== null &&
                      jobDetailsData?.state !== undefined &&
                      `${jobDetailsData?.state}, `}
                    {jobDetailsData?.country !== null &&
                      jobDetailsData?.country !== undefined &&
                      `${jobDetailsData?.country}`}
                  </p>
                  <p className={classes.userProfileLink}>
                    {jobDetailsData?.user?.fb_profile_link &&
                      jobDetailsData?.user?.fb_profile_link !== null && (
                        <span
                          onClick={() =>
                            window.open(
                              `${jobDetailsData?.user?.fb_profile_link}`,
                              "_blank"
                            )
                          }
                        >
                          <img
                            alt="facebook"
                            src={
                              process.env.PUBLIC_URL + "/assets/u-facebook.svg"
                            }
                            style={{ borderRadius: 18 }}
                          />
                          {userDetails?.fb_profile_name === null
                            ? "Profile"
                            : userDetails?.fb_profile_name}
                        </span>
                      )}

                    {jobDetailsData?.user?.ld_profile_link &&
                      jobDetailsData?.user?.ld_profile_link !== null && (
                        <span
                          onClick={() =>
                            window.open(
                              `${jobDetailsData?.user?.ld_profile_link}`,
                              "_blank"
                            )
                          }
                        >
                          <img
                            alt="linkedin"
                            src={
                              process.env.PUBLIC_URL + "/assets/u-linkedin.svg"
                            }
                          />
                          {userDetails?.ld_profile_name === null
                            ? "Profile"
                            : userDetails?.ld_profile_name}
                        </span>
                      )}
                  </p>
                </div>
              </div>
            )}
          </Paper>
          {jobDetailsData?.job_skills?.length > 0 && (
            <Paper
              className={clsx(classes.boxShadow, classes.JobDescroptionBoxCls)}
            >
              <h5>Skills Required</h5>
              <div className={classes.jobSkillsBoxCls}>
                {jobDetailsData?.job_skills &&
                  jobDetailsData?.job_skills.map((iteam, key) => {
                    if (iteam?.global_skill !== null) {
                      return (
                        <JobChips iteamTitle={iteam?.global_skill?.skill} />
                      );
                    }
                  })}
              </div>
            </Paper>
          )}

          {jobDetailsData?.job_medias?.length > 0 && (
            <Paper
              className={clsx(classes.boxShadow, classes.JobDescroptionBoxCls)}
            >
              <h5>Attachments</h5>
              <div className={classes.attachmentsCls}>
                {jobDetailsData?.job_medias &&
                  jobDetailsData?.job_medias.map((iteam, key) => (
                    <span
                      onClick={() =>
                        showDocumentsModelAction(iteam, iteam?.media_type)
                      }
                    >
                      {iteam?.media_type == "Image" && <PhotoVideoIcon />}
                      {iteam?.media_type == "Video" && <VideoIconGrey />}
                      {iteam?.media_type == "Audio" && <AudioIcon />}
                      {iteam?.media_type != "Video" &&
                        iteam?.media_type != "Image" && <DocumentIcon />}
                      <span>
                        {iteam?.media_name != null
                          ? iteam?.media_name
                          : iteam?.media_type}
                      </span>
                    </span>
                  ))}
              </div>
            </Paper>
          )}
        </div>
      )}

      <ShareJobDialog
        shareJobDialogStatus={shareJobDialogStatus}
        shareJobDialogAction={shareJobDialogAction}
        jobDetails={jobDetailsData}
      />
      <ReferJobDialog
        referJobDialogStatus={referJobDialogStatus}
        referJobDialogAction={referJobDialogAction}
        jobDetails={jobDetailsData}
      />
      <ApplyJobDialog
        applyJobStatus={applyJobStatus}
        applyJobDialogAction={applyJobDialogAction}
        jobDetails={jobDetailsData}
        closeApplyJobDialogAction={closeApplyJobDialogAction}
        jobApplyType={"details"}
        mixpanelJobType={"Other"}
      />

      <ExtendJobApplicationDialog
        extendJobDialogStatus={extendJobDialogStatus}
        extendJobDialogAction={extendJobDialogAction}
        jobDetails={jobDetailsData}
        daysRemainingCount={daysRemaining}
      />
      <MarkCompleteDialoge
        markCompleteDialoge={markCompleteDialoge}
        setMarkCompleteDialoge={setMarkCompleteDialoge}
        jobDetails={jobDetailsData}
      />

      <ShareJob
        showShareDialog={showShareDialog}
        setShowShareDialog={setShowShareDialog}
        jobDetails={jobDetailsData}
      />

      <Dialog
        open={openDocumentModal}
        aria-labelledby="form-dialog-title"
        classes={{
          paper: classes.postImgDialog,
        }}
      >
        <DialogTitle
          id="form-dialog-title"
          color="primary"
          disableTypography
          classes={{
            root: classes.dialogTitleRoot,
          }}
        >
          <Grid item xs={12} className={classes.modalCloseBtn}>
            <div style={{ color: "#26262D", fontWeight: 600 }}></div>
            <Button
              className={classes.closeIconButton}
              color="primary"
              onClick={() => setOpenDocumentModal(false)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </Button>
          </Grid>
        </DialogTitle>
        <DialogContent classes={{ root: classes.rootDialogContentImg }}>
          <div>
            {openDocumentType == "Document" && (
              <iframe id="viewer" src={openDocumentItem?.media}></iframe>
            )}
            {openDocumentType == "Audio" && (
              <ReactPlayer
                className={classes.popupAudioMainCls}
                controls={true}
                playing={true}
                pip={false}
                url={openDocumentItem?.media}
                style={{ width: "auto" }}
              />
            )}

            {openDocumentType == "Video" && (
              <ReactPlayer
                className={classes.popupVideoMainCls}
                controls={true}
                playing={true}
                pip={false}
                url={openDocumentItem}
                style={{ width: "auto" }}
              />
            )}
            {openDocumentType == "Image" && (
              <Slider>
                <div>
                  <img
                    style={{ maxWidth: "95%", maxHeight: 400 }}
                    src={openDocumentItem?.media}
                    alt=""
                  />
                </div>
              </Slider>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

const mapStateToProps = (state) => ({
  userDetails: state.home.userDetails,
  isSaveJobLoading: state.job.isSaveJobLoading,
  userApplicationsList: state.job.userApplicationsList,
  userApplicationsCount: state.job.userApplicationsCount,
  newUserApplicationsList: state.job.newUserApplicationsList,
  newUserApplicationsCount: state.job.newUserApplicationsCount,
  isUniqueJobActionLoading: state.job.isUniqueJobActionLoading,
  uniqueJobActionStatus: state.job.uniqueJobActionStatus,
  uniqueJobActiondSuccessMessage: state.job.uniqueJobActiondSuccessMessage,
  uniqueJobActiondErrorMessage: state.job.uniqueJobActiondErrorMessage,
});

const mapDispatchToProps = (dispatch) => ({
  emptyJobInitState: (key, value) =>
    dispatch({ type: EMPTY_JOB_INIT_STATE, key, value }),
  getSkillsList: (search_string) =>
    dispatch({ type: START_GET_SKILLS_LIST, search_string }),
  getWorkList: (search_string) =>
    dispatch({ type: START_GET_CAPABILITIES_LIST, search_string }),
  createNewJob: (data, document) =>
    dispatch({ type: START_CREATE_NEW_JOB, data, document }),
  jobRecommendationUserAction: (jobId) =>
    dispatch({ type: START_GET_JOB_RECOMMENDATION_USER, jobId }),
  getUserProfileScrore: () => dispatch({ type: START_USER_PROFILE_SCORE }),
  getJobSortLinkAction: (jobId) =>
    dispatch({ type: START_GET_JOB_SORT_LINK, jobId }),
  saveJobAction: (data) => dispatch({ type: START_SAVE_JOB, data }),
  jobUniqueActionWithTypeAction: (actionType, jobId) =>
    dispatch({ type: START_JOB_UNIQUE_ACTION, actionType, jobId }),
});

export default connect(mapStateToProps, mapDispatchToProps)(JobDetails);