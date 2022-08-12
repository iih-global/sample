import React, { useState } from "react";
import {
  makeStyles,
  Paper,
  Grid,
  Avatar,
  Button,
  Typography,
  TimelineDot,
  Select,
  MenuItem,
  Stack,
  TabChip,
} from "Components/Common/MuiComponents";
import DemoProfile from "assets/Logos/DemoProfile.svg";
import DemoBackground from "assets/Logos/DemoBackground.svg";
import PrimaryIcon from "Components/Common/PrimaryIcon";
import { ReactComponent as EditProfileIcon } from "assets/Icons/EditProfileIcon.svg";
import { ReactComponent as ShareIcon } from "assets/Icons/ShareIcon.svg";
import { useNavigate } from "react-router-dom";

const useStyle = makeStyles((theme) => ({
  yhProfileRoot: {
    padding: "0px 0px 20px 0px",
    border: `1px solid ${theme.palette.secondary.main}40`,
    borderRadius: "10px !important",
  },
  yhProfileBackground: {
    height: "140px",
    "&>img": {
      width: "100%",
      height: "100%",
      borderRadius: "10px 10px 0px 0px",
      objectFit: "cover",
    },
  },
  yhProfileContentRoot: {
    padding: "0px 15px",
  },
  yhProfileContent: {
    marginTop: "-20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    "&>div": {
      "&>button": {
        marginTop: "5px",
        padding: "8px 10px",
        minWidth: "auto",
        "&:last-child": {
          marginLeft: "15px",
        },
      },
    },
  },
  yhFeedUSerDetail: {
    marginTop: "15px",
    "&>div": {
      marginBottom: "15px",
      "&>span": {
        borderWidth: "2px",
        padding: "2px",
        margin: "auto 15px",
      },
    },
  },
  yhvisibilitySelector: {
    "&>div": {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      fontSize: 14,
      color: `${theme.palette.secondary.main}`,
    },
    "&>fieldset": {
      border: "none !important",
    },
  },
  yhProfilePostMedia: {
    marginTop: "15px",
  },
  filterWrapper: {
    marginBottom: "20px !important",
    overflowX: "auto",
    "&::-webkit-scrollbar": {
      display: "none",
    },
  },
}));

const MyProfile = () => {
  const classes = useStyle();
  const navigate = useNavigate();

  const [visibilityStatus, setVisibilityStatus] = useState("available");
  const [mediaType, setMediaType] = useState("post");

  const mediaTypes = [
    {
      label: "All Post(0)",
      value: "post",
    },
    {
      label: "All Media(0)",
      value: "media",
    },
  ];

  return (
    <>
      <Paper elevation={0} className={classes.yhProfileRoot}>
        <Grid className={classes.yhProfileBackground}>
          <img src={DemoBackground} alt="feed" />
        </Grid>
        <Grid className={classes.yhProfileContentRoot}>
          <Grid className={classes.yhProfileContent}>
            <Avatar src={DemoProfile} sx={{ width: "80px", height: "80px" }} />
            <Grid>
              <Button
                endIcon={
                  <PrimaryIcon
                    icon={EditProfileIcon}
                    color="primary"
                    width="16px"
                    height="16px"
                  />
                }
                onClick={() => navigate("/setting")}
                medium
                variant="outlined"
              >
                Edit Profile
              </Button>
              <Button medium variant="outlined">
                <PrimaryIcon
                  icon={ShareIcon}
                  color="primary"
                  width="16px"
                  height="16px"
                />
              </Button>
            </Grid>
          </Grid>
          <Grid className={classes.yhFeedUSerDetail}>
            <Typography variant="h4">Eduarda Sousa Goncalves</Typography>
            <Grid container>
              <Typography color="secondary" variant="body1">
                @eduarda_sousa
              </Typography>
              <TimelineDot />
              <Select
                className={classes.yhvisibilitySelector}
                sx={{ width: "auto" }}
                value={visibilityStatus}
                size="small"
                onChange={(e) => setVisibilityStatus(e.target.value)}
              >
                <MenuItem value={"available"}>{"Available"}</MenuItem>
                <MenuItem value={"invisible"}>{"Invisible"}</MenuItem>
              </Select>
            </Grid>
            <Grid>
              <Typography variant="body1">
                Lorem Ipsum is simply dummy text of the printing and typesetting
                industry. Lorem Ipsum has been the industry's standard dummy
                text ever
              </Typography>
            </Grid>
          </Grid>
        </Grid>
      </Paper>
      <Grid className={classes.yhProfilePostMedia}>
        <Stack direction="row" spacing={1.25} className={classes.filterWrapper}>
          {mediaTypes?.map((item, index) => {
            return (
              <TabChip
                clickable
                elevation={0}
                key={index}
                label={item?.label}
                selected={mediaType === item?.value}
                onClick={() => setMediaType(item?.value)}
              />
            );
          })}
        </Stack>
      </Grid>
    </>
  );
};

export default MyProfile;
