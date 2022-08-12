/* eslint-disable jsx-a11y/accessible-emoji */
/* eslint-disable array-callback-return */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable eqeqeq */
import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Dialog from "@material-ui/core/Dialog";
import { useHistory } from "react-router";
import { ReactComponent as CloseChipIcon } from "../../assets/CloseChipIcon.svg";

const SecondaryButton = React.lazy(() =>
  import("../commonComponents/SecondaryButton")
);

const RequestUserProfileDetails = React.lazy(() =>
  import("./RequestUserProfileDetails")
);

const WriteReviewStepBox = React.lazy(() => import("./WriteReviewStepBox"));

const useClasses = makeStyles((theme) => ({
  dialog: {
    width: "400px !important",
    maxWidth: 400,
    [theme.breakpoints.down("xs")]: {
      width: "90% !important",
    },
  },
  requestReviewSuccess: {
    padding: "0px 20px",
    "&>svg": {
      width: 15,
      height: 15,
      position: "absolute",
      right: 25,
      top: 27,
      cursor: "pointer",
    },
    "&>h5": {
      textAlign: "center",
      fontSize: 20,
      color: "#FA6017",
      margin: "15px 0px 20px 0px",
      [theme.breakpoints.down("xs")]: {
        marginTop: 60,
      },
    },
    "&>p": {
      textAlign: "center",
      maxWidth: 390,
      width: "100%",
      margin: "auto",
      marginBottom: 15,
      fontWeight: 600,
      fontSize: 16,
    },
    "&>button": {
      margin: "35px auto !important",
      display: "block",
      padding: "0px 25px !important",
      "&>span": {
        fontSize: 16,
        fontWeight: 600,
      },
    },
  },
  nameTextCapital: {
    textTransform: "capitalize",
  },
}));

export default function UserRequestReview(props) {
  const {
    userReviewRequestData,
    requestId,
    saveUserReviewRequest,
    saveUserReviewRequestStatus,
    isSaveUserReviewRequestLoading,
  } = props;

  const classes = useClasses();
  const history = useHistory();
  const [reviewTextareaValue, setReviewTextareaValue] = useState("");

  const [capabilityDetails, setcapabilityDetails] = useState("");
  const [reputationList, setreputationList] = useState([]);
  const [skillsList, setskillsList] = useState([]);

  const [actionStep, setactionStep] = useState(0);
  const [openDialog, setopenDialog] = React.useState(false);

  useEffect(() => {
    if (saveUserReviewRequestStatus === true) {
      setopenDialog(!openDialog);
    }
  }, [saveUserReviewRequestStatus]);

  useEffect(() => {
    if (window.localStorage.getItem("reviewData") !== null) {
      let tempData = JSON.parse(window.localStorage.getItem("reviewData"));
      console.log(">>tempData", tempData?.review);
      setReviewTextareaValue(tempData?.review);
      setreputationList(tempData?.reputation);
      setskillsList(tempData?.capability[0].skills);
      setcapabilityDetails({
        cpb_name: tempData?.capability[0]?.cpb_name,
        id: tempData?.capability[0]?.id,
        is_pending: tempData?.capability[0]?.is_pending,
      });
      setactionStep(1);
    }
  }, []);

  useEffect(() => {
    if (
      userReviewRequestData !== "" &&
      window.localStorage.getItem("reviewData") === null
    ) {
      if (userReviewRequestData?.capability) {
        userReviewRequestData.capability.map((item, key) => {
          setcapabilityDetails({
            cpb_name: item?.cpb_name,
            id: item?.id,
            is_pending: item?.is_pending,
          });
          if (item.skills.length > 0) {
            setskillsList(item.skills);
          }
        });
      }
      if (userReviewRequestData?.reputation) {
        setreputationList(userReviewRequestData?.reputation);
      }
    }
  }, [userReviewRequestData]);

  const skillRatingAction = (newRating, skill_id) => {
    let newSkillsList = skillsList.map((s) =>
      s.id === skill_id
        ? {
            ...s,
            rates: newRating,
          }
        : s
    );

    setskillsList(newSkillsList);
  };
  const reputationsChangeAction = (status, rep_id) => {
    const reputationVal = reputationList.map((r) =>
      r.id === rep_id
        ? {
            ...r,
            is_thump: status,
          }
        : r
    );
    setreputationList(reputationVal);
  };
  const updateReviewTextarea = (e) => {
    setReviewTextareaValue(e.target.value);
  };
  const saveReviewRequestAction = () => {
    let tempcapabilityDetails = capabilityDetails;
    tempcapabilityDetails.skills = skillsList;
    let userReviewData = {
      capability: [tempcapabilityDetails],
      reputation: reputationList,
      request_id: requestId,
      review: reviewTextareaValue,
    };
    if (
      window.localStorage.getItem("token") !== "" &&
      window.localStorage.getItem("token") !== null
    ) {
      saveUserReviewRequest(userReviewData);
    } else {
      window.localStorage.setItem("userType", "new-user");
      window.localStorage.setItem("reviewData", JSON.stringify(userReviewData));
      window.localStorage.setItem("reviewURL", window.location.href);
      history.push("/sign-up");
    }
  };

  const updateStepAction = (value, step) => {
    if (step === 0) {
      setactionStep(0);
    }
    if (step === 1) {
      setactionStep(1);
    }
  };

  return (
    <>
      {actionStep === 0 && (
        <RequestUserProfileDetails
          userData={userReviewRequestData?.who_request}
          updateStepAction={updateStepAction}
        />
      )}

      {actionStep === 1 && (
        <WriteReviewStepBox
          userData={userReviewRequestData?.who_request}
          capabilityDetails={capabilityDetails}
          skillsList={skillsList}
          reputationList={reputationList}
          updateStepAction={updateStepAction}
          skillRatingAction={skillRatingAction}
          reputationsChangeAction={reputationsChangeAction}
          updateReviewTextarea={updateReviewTextarea}
          saveReviewRequestAction={saveReviewRequestAction}
          isSaveUserReviewRequestLoading={isSaveUserReviewRequestLoading}
          reviewTextareaValue={reviewTextareaValue}
        />
      )}

      <div>
        <Dialog
          open={openDialog}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          classes={{
            paper: classes.dialog,
          }}
        >
          <div className={classes.requestReviewSuccess}>
            <CloseChipIcon onClick={() => history.push("/")} />
            <h5>Thank You! 🎉</h5>
            <p>
              Your review goes a long way to helping{" "}
              <span className={classes.nameTextCapital}>
                {userReviewRequestData?.who_request?.name}
              </span>{" "}
              build a strong reputation for their work.
            </p>
            <p>
              <span className={classes.nameTextCapital}>
                {userReviewRequestData?.who_request?.name}
              </span>{" "}
              will surely be grateful, we’ll let them know your review is in.
            </p>
            {window.localStorage.getItem("userType") == "new-user" && (
              <SecondaryButton
                variant="outlined"
                color="orange"
                children="Learn More About Umwuga"
                onClick={() => window.open("https://umwuga.com/", "_blank")}
              />
            )}
          </div>
        </Dialog>
      </div>
    </>
  );
}