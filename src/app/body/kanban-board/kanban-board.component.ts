import { Component, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Tasks } from 'src/app/Interface/TasksInterface';
import { ApplicationSettingsService } from 'src/app/services/applicationSettings/application-settings.service';
import { BackendService } from 'src/app/services/backend/backend.service';
import { ErrorHandlerService } from 'src/app/services/error-handler/error-handler.service';
import { NavbarHandlerService } from 'src/app/services/navbar-handler/navbar-handler.service';
import { StartServiceService } from 'src/app/services/start/start-service.service';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ToolsService } from 'src/app/services/tool/tools.service';
import { AuthService } from 'src/app/services/auth.service';
import { Sprint } from 'src/app/Interface/TeamInterface';

@Component({
  selector: 'app-kanban-board',
  templateUrl: './kanban-board.component.html',
  styleUrls: ['./kanban-board.component.css']
})
export class KanbanBoardComponent implements OnInit {

  componentName: string = "KANBAN-BOARD";
  selectedTeamId: string;
  statusLabels: string[];
  selectedStatusLabels: string[];
  tasks = [];
  showLoader: boolean;
  todayDate: string;
  time: string;
  sprintNotExist: boolean;
  showContent: boolean;
  child: any;
  sprintData: Sprint;
  currentSprintName: string;
  currentSprintNumber: number;
  filterSprintNumber: number;

  constructor(public navbarHandlerService: NavbarHandlerService, public startService: StartServiceService, public applicationSettingsService: ApplicationSettingsService, public backendService: BackendService, private functions: AngularFireFunctions, public errorHandlerService: ErrorHandlerService, public toolsService: ToolsService, public authService: AuthService) { }

  ngOnInit(): void {
    this.navbarHandlerService.resetNavbar();
    this.navbarHandlerService.addToNavbar(this.componentName);

    this.todayDate = this.toolsService.date();
    this.time = this.toolsService.time();

    if(this.startService.showTeamsData) {
      this.readData();
    } else {
      this.startService.userDataStateObservable.subscribe((data) => {
        if(data){
          this.startService.applicationDataStateObservable.subscribe((data) => {
            if(data) {
              this.applicationSettingsService.teamData.subscribe((data) => {
                if(data) {
                  this.readData();
                }
              });
            }
          });
        }
      });
    }
  }

  readData() {
    this.selectedStatusLabels = ['Ice Box', 'Ready to start', 'Under Progress', 'Blocked'];
    this.selectedTeamId = this.startService.selectedTeamId;
    this.statusLabels = this.applicationSettingsService.status;
    this.currentSprintNumber = this.startService.currentSprintNumber;
    if(this.currentSprintNumber==-1){
      this.currentSprintName= "Backlog";
    }
    else if(this.currentSprintNumber==-2){
      this.currentSprintName= "Deleted";
    }
    else{
    this.currentSprintName = "Sprint " + this.currentSprintNumber;
    }
    this.filterSprintNumber=this.currentSprintNumber;
    this.readTasks();
  }

  updateSelectedTeamId(teamId: string) {
    this.applicationSettingsService.editedTeamId = teamId;
    this.startService.selectedTeamId = teamId;
    this.authService.userAppSetting.SelectedTeamId = teamId;
    this.startService.changeTeam = true;
    this.sprintNotExist = false;
    this.showContent = false;

    const callable = this.functions.httpsCallable('users/updateSelectedTeam');
    callable({Uid: this.startService.uid , SelectedTeam: this.startService.selectedTeamId}).subscribe({
        next: (data) => {
          this.tasks=[];
          this.readData();
        },
        error: (error) => {
          this.errorHandlerService.showError = true;
          this.errorHandlerService.getErrorCode(this.componentName, "InternalError","Api");
          console.error(error);
        },
        complete: () => console.info('Successful updated Selected Team in db')
    });
  }

  changeSprintNumber() {
    if(this.filterSprintNumber==0){
      this.filterSprintNumber=-1;
    }
    else if(this.filterSprintNumber<-2){
      this.filterSprintNumber=-2;
    }
    this.currentSprintNumber=this.filterSprintNumber;
    if(this.currentSprintNumber==-1){
      this.currentSprintName= "Backlog";
    }
    else if(this.currentSprintNumber==-2){
      this.currentSprintName= "Deleted";
    }
    else{
    this.currentSprintName = "Sprint " + this.currentSprintNumber;
    }
    this.tasks=[];
    this.readTasks();
  }

  readTasks() {
    this.showLoader = true;
    const orgDomain = this.backendService.getOrganizationDomain();
    const callable = this.functions.httpsCallable("tasks/getAllTasks");

    callable({OrgDomain: orgDomain, TeamId: this.selectedTeamId, SprintNumber: this.currentSprintNumber }).subscribe ({
      next: (data) => {
        this.putDataInTasksArray(data.data);
        this.showLoader = false;
        console.log("read tasks successfully!")
      },
      error: (error) => {
        this.errorHandlerService.showError = true;
        this.errorHandlerService.getErrorCode(this.componentName, "InternalError","Api");
      },
      complete: () => console.info("tasks read successfully")   
    }) 
  }

  putDataInTasksArray(tasksData: Tasks[]) {
    this.selectedStatusLabels.forEach((label) => {
      let tasksarr = [];
      tasksData.forEach((task) => {
        if (task.Status == label) {
          tasksarr.push(task);
        }
      });
      this.tasks.push(tasksarr);
    });
  }

  editTask(task: Tasks, status: string) {
    const appKey = this.backendService.getOrganizationAppKey();
    const callable = this.functions.httpsCallable('tasks/editTask');
    return callable({Title: task.Title, Status: status, AppKey: appKey, Id: task.Id, Description: task.Description, Priority: task.Priority, Difficulty: task.Difficulty, Assignee: task.Assignee, EstimatedTime: task.EstimatedTime, Project: task.Project, SprintNumber: task.SprintNumber, StoryPointNumber: task.StoryPointNumber, OldStoryPointNumber: task.StoryPointNumber, PreviousId: task.SprintNumber, CreationDate: task.CreationDate, Date: this.todayDate, Time: this.time, ChangedData: "", Uid: this.authService.user.uid, Type:task.Type, Reporter: task.Reporter});
  }

  onDrop(event: CdkDragDrop<Tasks[]>, status: string) {
    this.showLoader = true;
    var result;
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.showLoader = false;
    } else {
      this.editTask(event.previousContainer.data[event.previousIndex], status).subscribe({
        next: (data) => {
          result = data;
          if (result == "OK") {
            transferArrayItem(event.previousContainer.data, event.container.data, event.previousIndex, event.currentIndex);
            this.showLoader = false;
          }
        },
        error: (error) => {
          console.error(error);
          this.showLoader = false;
        },
        complete: () => console.info("task edited successfully!")
      });  
    }
  }

  getColor(status: string) {
    if (status == 'Ready to start') {
      return '#673AB7';
    } else if (status == "Ice Box") {
      return '#42A5F5';
    } else if (status == "Under Progress") {
      return '#FC6A03';
    } else if (status == "Blocked") {
       return '#E64336';
    } else {
      return '#00F11E';
    }
  }

}
