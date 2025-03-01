/*********************************************************** 
* Copyright (C) 2022 
* Worktez 
* 
* This program is free software; you can redistribute it and/or 
* modify it under the terms of the MIT License 
* 
* 
* This program is distributed in the hope that it will be useful, 
* but WITHOUT ANY WARRANTY; without even the implied warranty of 
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
* See the MIT License for more details. 
***********************************************************/
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators'
import { Tasks, Link } from 'src/app/Interface/TasksInterface';
import { CloneTaskService } from 'src/app/services/cloneTask/clone-task.service';
import { AuthService } from 'src/app/services/auth/auth.service';
import { ToolsService } from '../../services/tool/tools.service';
import { Location } from '@angular/common';
import { NavbarHandlerService } from 'src/app/services/navbar-handler/navbar-handler.service';
import { ErrorHandlerService } from 'src/app/services/error-handler/error-handler.service';
import { BackendService } from 'src/app/services/backend/backend.service';
import { Activity } from 'src/app/Interface/ActivityInterface';
import { UserServiceService } from 'src/app/services/user-service/user-service.service';
import { ApplicationSettingsService } from 'src/app/services/applicationSettings/application-settings.service';
import { StartServiceService } from 'src/app/services/start/start-service.service';
import { PopupHandlerService } from '../../services/popup-handler/popup-handler.service';
import { ValidationService } from 'src/app/services/validation/validation.service';
import { GitPrData } from 'src/app/Interface/githubOrgData';
import { RBAService } from 'src/app/services/RBA/rba.service';
import { TeamServiceService } from 'src/app/services/team/team-service.service';
import { GithubServiceService } from 'src/app/services/github-service/github-service.service';
import { GitlabServiceService } from 'src/app/services/gitlab-service/gitlab-service.service';
import { GitDetails } from 'src/app/Interface/TeamInterface';
declare var jQuery:any;

@Component( {
  selector: 'app-task-details',
  templateUrl: './task-details.component.html',
  styleUrls: [ './task-details.component.css' ]
} )
export class TaskDetailsComponent implements OnInit {

  componentName: string = "TASK-DETAILS"

  sprintName: string
  Id: string
  logWorkEnabled: boolean = false
  gitPrEnabled: boolean = false
  addWatcherEnabled: boolean = false;
  editTaskEnabled: boolean = false
  deleteTaskEnabled: boolean = false
  linkEnabled: boolean = false
  userLoggedIn: boolean = false
  showContent: boolean = false;
  activeAllBtn: boolean = false
  activeLogWorkBtn: boolean = false
  activeCommentBtn: boolean = false
  activeEditBtn: boolean = false
  task: Tasks
  creationDate: string
  time: string
  assignee: string
  creator: string
  watcherList: string[] =[]
  orgDomain: string
  actionType: string = "All"
  comment: string = "";
  url: string;
  addedWatcher: boolean = false;
  newWatcher: string = "";
  prLink: string;
  prData: GitPrData[] = [];

  dataReady: boolean = false
  activityDataReady: boolean = false

  gotTaskData: boolean=false;
  showLoader: boolean=false;

  activityData: Activity[]
  linkData: Link[]
  prLinked: boolean = false;
  prApiLink: string;
  totalEstimatedTime: number;
  estimatedTimeHrs: number;
  estimatedTimeMins: number;
  totalLoggedTime: number;
  loggedTimeHrs: number;
  loggedTimeMins: number;
  totalRemainingTime: number;
  remainingTimeHrs: number;
  remainingTimeMins: number
  githubRepoExists: boolean = false;
  prFound: boolean = false;
  createGitIssue: boolean = false;
  githubTokenExists: boolean = false;
  provider: string;
  projectId: number;
  gitData: GitDetails[];

  constructor (private githubService: GithubServiceService, public gitlabService: GitlabServiceService,public rbaService: RBAService, public startService: StartServiceService, public applicationSettingService: ApplicationSettingsService, private route: ActivatedRoute, private functions: AngularFireFunctions, public authService: AuthService, private location: Location, public toolsService: ToolsService, private navbarHandler: NavbarHandlerService, public errorHandlerService: ErrorHandlerService, private backendService: BackendService, public cloneTask: CloneTaskService,public userService:UserServiceService,public popupHandlerService: PopupHandlerService, public validationService: ValidationService, public teamService: TeamServiceService  ) { }

  ngOnInit (): void {
    this.newWatcher = this.authService.getUserEmail();
    this.creationDate = this.toolsService.date();
    this.time = this.toolsService.time();
        
    this.Id = this.route.snapshot.params[ 'taskId' ];
    this.url = window.location.href;

    this.backendService.selectedTaskId = this.Id;

    this.navbarHandler.addToNavbar( this.Id );
    this.getTaskPageData();
  }
  
  checkPrLinked(){
    if(this.task.PrLink!=undefined && this.task.PrNumber != undefined){
      if(this.task.PrLink=="" || this.task.PrApiLink=="" || this.task.PrNumber==null ){
        this.prLinked=false;
      }
      else{
        this.prLink=this.task.PrLink;
        this.prApiLink=this.task.PrApiLink;
        this.provider = "Github"
        this.getPrDetails();
        this.prLinked=true;
        this.prFound = true;
      }
    }
  }

  checkMrLinked(){
    if(this.task.PrLink!=undefined && this.task.PrNumber != undefined){
      if(this.task.PrApiLink=="" || this.task.PrNumber==null){
        this.prLinked=false;
      }
      else{
        this.prLink=this.task.PrApiLink;
        this.prApiLink=this.task.PrApiLink;
        this.provider="gitlab";
        this.getPrDetails();
        this.prLinked=true;
        this.prFound = true;
      }
    }
  }

  getPrDetails() {
    if(this.provider == "Github") {
      this.githubService.getPrDetails(this.prApiLink.slice(29)).pipe(map(data => {
        const prData = data as GitPrData[];     
        return prData;
      })).subscribe(data => {
        this.prData = data;
      });
    } 
    else if(this.provider == "gitlab") {
      const orgDomain = this.backendService.getOrganizationDomain();
      const teamName = this.teamService.teamsDataJson[this.task.TeamId].TeamName;
      this.gitData=this.teamService.getGitDetails(orgDomain, teamName);
      this.projectId = this.gitData['ProjectId'];
      this.gitlabService.getMrDetails(this.projectId,this.task.PrNumber).pipe(map(data => {
        const prData = data as GitPrData[];    
        return prData;
      })).subscribe(data => {
        this.prData = data;
      });
    }
  }

  getTaskPageData(){
    if(this.startService.showTeams) {
      this.orgDomain = this.backendService.getOrganizationDomain();
      this.getTaskDetail();
      this.getActivityData();
      this.getLinkData();
      this.activeAllBtn = true;
    } else {
      this.startService.applicationDataStateObservable.subscribe((data) => {
        if(data){
          this.orgDomain = this.backendService.getOrganizationDomain();
          this.getTaskDetail();
          this.getActivityData();
          this.getLinkData();
          this.activeAllBtn = true;
        }
      });
    }
  }

  selectedAssignee(item) {
    console.log(item);
  }

  getTaskDetail () {
    const callable = this.functions.httpsCallable('tasks/getTaskDetails');
    callable({Id: this.Id, OrgDomain: this.orgDomain}).pipe(map(res => {
        const data = res.taskData as Tasks;
        return { ...data }
    })).subscribe({
      next: (data) => {
        this.task = data;
        this.getTimeDetails();
        this.checkGitRepoExists();
        this.checkGitTokenExists();
        this.provider = this.teamService.teamsDataJson[this.task.TeamId].ProjectLocation;
        if (this.task.Watcher.includes(this.newWatcher)) {
          this.addedWatcher = true;
        }
        this.userService.checkAndAddToUsersUsingEmail(this.task.Assignee);
        this.userService.checkAndAddToUsersUsingEmail(this.task.Reporter);
        this.userService.checkAndAddToUsersUsingEmail(this.task.Creator);

        this.userService.fetchUserData().subscribe(()=>{
          this.dataReady = true;
        });

        this.applicationSettingService.getTeamDetails(data.TeamId);
        this.gotTaskData=true;
      },
      error: (error) => {
        this.errorHandlerService.showError = true;
        this.errorHandlerService.getErrorCode(this.componentName, "InternalError","Api");
        console.error(error);
      },
      complete: () => console.info('Getting Task successful')
    });
  }

  checkGitRepoExists(){
    console.log(this.teamService.teamsDataJson[this.task.TeamId].ProjectLink);
    if(this.teamService.teamsDataJson[this.task.TeamId].ProjectLink != undefined && this.teamService.teamsDataJson[this.task.TeamId].ProjectLink != ""){
      this.githubRepoExists = true;
      this.checkPrLinked();
      this.checkMrLinked();
    }
  }
  
  getTimeDetails(){
    this.totalEstimatedTime=this.task.EstimatedTime;
    [this.estimatedTimeHrs, this.estimatedTimeMins ]= this.toolsService.changeToHourMinsTime(this.totalEstimatedTime);

    this.totalLoggedTime= this.task.LogWorkTotalTime;
    [this.loggedTimeHrs, this.loggedTimeMins] = this.toolsService.changeToHourMinsTime(this.totalLoggedTime)

    this.totalRemainingTime= this.totalEstimatedTime - this.task.LogWorkTotalTime;
    [this.remainingTimeHrs, this.remainingTimeMins] = this.toolsService.changeToHourMinsTime(this.totalRemainingTime)
    
    if(this.remainingTimeHrs==0 && this.remainingTimeMins==0){
      this.totalRemainingTime=0
    }
  }

  getActivityData () {
    this.activityDataReady = false;
    const callable = this.functions.httpsCallable("activity/getActivity");
     callable({OrgDomain: this.orgDomain, TaskId: this.Id, ActionType: this.actionType }).pipe(
      map(actions => {
        const data = actions.data as Activity[];
        return data
    })).subscribe({
      next: (data) => {
        data.forEach(element => {
          this.userService.checkAndAddToUsersUsingUid(element.Uid);
        });

        if(!this.userService.userReady) {
          this.userService.fetchUserDataUsingUID().subscribe(()=>{
            this.activityDataReady = true;
          });
        } else {
          this.activityDataReady = true;
        }
        this.activityData=data;
      },
      error: (error) => {
        console.error(error);
      },
      complete: () => console.info('Getting Sprint Evaluation data successful')
    });
  }

  getLinkData() {
    const callable = this.functions.httpsCallable("linker/getLink");
    callable({OrgDomain: this.orgDomain, TaskId: this.Id }).pipe(
      map(actions => {
        return actions.data as Link[];
    })).subscribe({
      next: (data) => {
        this.linkData=data;
      },
      error: (error) => {
        console.error(error);
      },
      complete: () => console.info('Getting Sprint Evaluation data successful')
    });
  }

  removeLink(linkId, linkType){
    const callable = this.functions.httpsCallable('linker/removeLink');
    callable({ OrgDomain: this.orgDomain, TaskId: this.Id, LinkType: linkType, LinkId:linkId  }).subscribe({
      next: (data) => {
        return;
      },
      error: (error) => {
        this.errorHandlerService.showError = true;
        this.errorHandlerService.getErrorCode(this.componentName, "InternalError", "Api");
        console.error(error);
      },
      complete: () => {
        this.getLinkData()
        this.getTaskDetail()
        console.info('Successfully created Link')
      }});
    }

   addComment() {
    this.activityDataReady = false

    var condition= (this.validationService.checkValidity(this.componentName, [{label: "comment", value: this.comment.trim()}])).then(res => {
      return res;
    });
    if(condition){
      const callable = this.functions.httpsCallable('tasks/comment');
      const appKey = this.backendService.getOrganizationAppKey();

      callable({ AppKey: appKey, Assignee: this.task.Assignee, LogTaskId: this.task.Id, LogWorkComment: this.comment, Date: this.creationDate, Time: this.time, Uid: this.authService.user.uid }).subscribe({
        next: (data) => {
          this.comment = "";
        },
        error: (error) => {
          this.errorHandlerService.showError = true;
          this.errorHandlerService.getErrorCode(this.componentName, "InternalError","Api");
          console.log("Error", error);
        },
        complete: () => {
          this.activityDataReady = true
          this.getActivityData();
          console.info('Successful')
          
        }
    });

    }
  }

  CloneTaskPage () {
    this.cloneTask.getCloneTask( this.task );
  }

  logWorkPage () {
    this.logWorkEnabled = true;
  }

  editTask () {
    this.editTaskEnabled = true;
  }

  deleteTask () {
    this.deleteTaskEnabled = true;
  }

  addLink() {
    this.linkEnabled = true;
  }

  addSubtask(){
    this.popupHandlerService.createNewTaskEnabled= true;  
    this.popupHandlerService.parentTaskId = this.Id;
    this.popupHandlerService.parentTaskUrl = this.url;
  }

  logWorkCompleted ( data: { completed: boolean } ) {
    this.getTaskPageData();
    this.logWorkEnabled = false;
  }

  editTaskCompleted ( data: { completed: boolean, task:Tasks } ) {
    this.getTaskPageData();
    this.editTaskEnabled = false;
  }

  deleteTaskCompleted ( data: { completed: boolean } ) {
    this.deleteTaskEnabled = false;
  }

  addedPrLink( data: { completed: boolean, prLink: string, prApiLink: string } ) {
    this.linkEnabled = false;
    this.prLinked=data.completed;
    this.prLink=data.prLink;
    this.prApiLink=data.prApiLink;
    this.getPrDetails();
    this.getLinkData();
    this.getTaskDetail();

  }

  reopenTask () {
    this.showLoader = true;
    const callable = this.functions.httpsCallable( 'tasks/log' );
    const appKey = this.backendService.getOrganizationAppKey();

    callable( {AppKey: appKey, SprintNumber: this.task.SprintNumber, LogTaskId: this.task.Id, LogHours: 0, LogWorkDone: 0, LogWorkStatus: "Ready to start", LogWorkComment: "Reopening", Date: this.creationDate, Time: this.time, Uid: this.authService.user.uid } ).subscribe({
      next: (data) => {
        this.getTaskPageData();
        this.showLoader = false;
        console.log("Successful");
      },
      error: (error) => {
        this.errorHandlerService.showError = true;
        this.errorHandlerService.getErrorCode(this.componentName, "InternalError","Api");
        console.log( "Error", error );
      },
      complete: () => console.info('Successful')
  });
      
  }

  backToTasks () {
    this.location.back()
  }

  changeType ( actionType: string ) {
    this.actionType = actionType
    this.getActivityData();
    if( this.actionType == "All" ) {
      this.activeEditBtn = false;
      this.activeLogWorkBtn = false;
      this.activeAllBtn = true;
      this.activeCommentBtn = false;
    } else if ( this.actionType == "LOGWORK_COMMENT") {
      this.activeAllBtn = false;
      this.activeEditBtn = false;
      this.activeLogWorkBtn = true;
      this.activeCommentBtn = false;
    } else if ( this.actionType == "EDITED") {
      this.activeAllBtn = false;
      this.activeLogWorkBtn = false;
      this.activeEditBtn = true;
      this.activeCommentBtn = false;
    } else if ( this.actionType == "COMMENT") {
      this.activeAllBtn = false;
      this.activeLogWorkBtn = false;
      this.activeEditBtn = false;
      this.activeCommentBtn = true;
    }
  }

  addWatcher() { 
    this.addWatcherEnabled = true;
  }

  addWatcherCompleted( data: { completed: boolean } ) {
    this.addWatcherEnabled = false;
    this.getTaskPageData();
  }

  linkPr() {
    this.popupHandlerService.addPrActive = true;
    this.gitPrEnabled = true;
    // this.showLoader = true;
  }

//   showPrDetails() {
//     if(this.prLink){
//       window.open(this.prLink,'_blank');
//       this.prFound = true;
//     }else{
//       console.error("error in  getting the pr");
//     }
// }

//   close(){
//     jQuery('#getPrDetails').modal('hide');
//   }
  

createGithubIssue(){
  this.createGitIssue = true;
}

createIssue(data: { completed:boolean } ){
  this.createGitIssue = false;
  this.getTaskPageData()
}

checkGitTokenExists(){
  if(this.teamService.teamsDataJson[this.task.TeamId].GitToken != undefined && this.teamService.teamsDataJson[this.task.TeamId].GitToken != "" && this.teamService.teamsDataJson[this.task.TeamId].GitToken != null){
    this.githubTokenExists = true;
  }
}

}

