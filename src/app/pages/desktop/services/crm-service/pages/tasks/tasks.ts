import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

export interface Task {
  id: number;
  subject: string;
  message: string;
  createDate: string;
  updateDate: string;
  createBy: string;
  updateBy: string;
  leadId: number | string;
  txtMsgNotification: boolean;
  dateTimeTask: string;
  read: boolean;
  assignedTo: number | string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
}

@Component({
  selector: 'app-tasks',
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './tasks.html',
  styleUrl: './tasks.css',
})
export class Tasks {
  @Input() leadId: string = '';
  @Input() tasks: Task[] = [];
  @Output() taskUpdated = new EventEmitter<Task>();

  showTaskForm = false;
  selectedTask: Task | null = null;
  selectedTaskDetail: Task | null = null;
  taskModel: Partial<Task> = {};

  currentView: 'grid' | 'kanban' = 'grid';
  viewOptions = ['grid', 'kanban'];
  taskStages = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];

  stats = [
    { label: 'Total Tasks', value: 0, icon: 'bi-list-task', color: 'primary' },
    { label: 'Completed', value: 0, icon: 'bi-check-circle', color: 'success' },
    { label: 'In Progress', value: 0, icon: 'bi-arrow-repeat', color: 'info' },
    { label: 'Pending', value: 0, icon: 'bi-hourglass', color: 'warning' }
  ];

  filters = {
    search: '',
    status: ''
  };

  users = [
      { id: 'user-uuid-123', name: 'John Doe' },
      { id: 'user-uuid-456', name: 'Jane Smith' },
      { id: 'user-uuid-789', name: 'Bob Johnson' }
  ];

  get isPageMode(): boolean {
    return !this.leadId;
  }

  get filteredTasks(): Task[] {
    return this.tasks.filter(task => {
      const matchesSearch = !this.filters.search ||
        task.subject?.toLowerCase().includes(this.filters.search.toLowerCase()) ||
        task.message?.toLowerCase().includes(this.filters.search.toLowerCase());
      const taskStatus = this.getTaskStatus(task);
      const matchesStatus = !this.filters.status || taskStatus === this.filters.status;
      return matchesSearch && matchesStatus;
    });
  }

  ngOnInit() {
    if (!this.tasks || this.tasks.length === 0) {
      this.loadSampleTasks();
    }
    if (this.isPageMode) {
      this.updateStats();
    }
  }

  loadSampleTasks() {
    this.tasks = [
      {
        id: 1,
        subject: 'Follow up call',
        message: 'Call to discuss the proposal and pricing',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        createBy: 'user-uuid-123',
        updateBy: 'user-uuid-123',
        leadId: this.leadId || 'lead-123',
        txtMsgNotification: true,
        dateTimeTask: new Date(Date.now() + 86400000).toISOString(),
        read: false,
        assignedTo: 'user-uuid-456',
        status: 'PENDING'
      },
      {
        id: 2,
        subject: 'Send quotation',
        message: 'Prepare and send the quotation for CRM implementation',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        createBy: 'user-uuid-123',
        updateBy: 'user-uuid-123',
        leadId: this.leadId || 'lead-123',
        txtMsgNotification: false,
        dateTimeTask: new Date(Date.now() + 172800000).toISOString(),
        read: true,
        assignedTo: 'user-uuid-123',
        status: 'COMPLETED'
      },
      {
        id: 3,
        subject: 'Design mockup review',
        message: 'Review the latest UI mockups for the dashboard',
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        createBy: 'user-uuid-456',
        updateBy: 'user-uuid-456',
        leadId: this.leadId || 'lead-123',
        txtMsgNotification: false,
        dateTimeTask: new Date(Date.now() + 43200000).toISOString(),
        read: false,
        assignedTo: 'user-uuid-789',
        status: 'IN_PROGRESS'
      }
    ];
  }

  setView(view: string) {
    this.currentView = view as 'grid' | 'kanban';
  }

  applyFilters() {
    this.updateStats();
  }

  clearFilters() {
    this.filters = { search: '', status: '' };
  }

  updateStats() {
    this.stats[0].value = this.tasks.length;
    this.stats[1].value = this.tasks.filter(t => this.getTaskStatus(t) === 'COMPLETED').length;
    this.stats[2].value = this.tasks.filter(t => this.getTaskStatus(t) === 'IN_PROGRESS').length;
    this.stats[3].value = this.tasks.filter(t => this.getTaskStatus(t) === 'PENDING').length;
  }

  getTasksByStage(stage: string): Task[] {
    return this.filteredTasks.filter(t => this.getTaskStatus(t) === stage);
  }

  onDrop(event: CdkDragDrop<Task[]>) {
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      const task = event.container.data[event.currentIndex];
      const newStatus = event.container.id as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
      task.status = newStatus;
      task.updateDate = new Date().toISOString();
      task.updateBy = 'current-user';
      task.read = newStatus === 'COMPLETED';
      this.updateStats();
      this.taskUpdated.emit(task);
    }
  }

  viewTask(task: Task) {
    this.selectedTaskDetail = task;
  }

  closeDetail() {
    this.selectedTaskDetail = null;
  }

  getStatusBadge(status: string): string {
    const badges: any = {
      'PENDING': 'bg-warning text-dark',
      'IN_PROGRESS': 'bg-info text-dark',
      'COMPLETED': 'bg-success'
    };
    return badges[status] || 'bg-secondary';
  }

  getStatusIcon(status: string): string {
    const icons: any = {
      'PENDING': 'bi-hourglass',
      'IN_PROGRESS': 'bi-arrow-repeat',
      'COMPLETED': 'bi-check-circle'
    };
    return icons[status] || 'bi-circle';
  }

  getTaskStatus(task: Task): string {
    return task.status || (task.read ? 'COMPLETED' : 'PENDING');
  }

  getInitials(name: string) {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
  }

  addTask() {
    this.selectedTask = null;
    this.taskModel = {
      subject: '',
      message: '',
      txtMsgNotification: false,
      read: false,
      assignedTo: '',
      status: 'PENDING',
      dateTimeTask: new Date().toISOString().slice(0, 16),
      createBy: 'current-user',
      updateBy: 'current-user',
      leadId: this.leadId
    };
    this.showTaskForm = true;
  }

  editTask(task: Task) {
    this.selectedTask = task;
    this.taskModel = {
      ...task,
      dateTimeTask: task.dateTimeTask ? task.dateTimeTask.slice(0, 16) : new Date().toISOString().slice(0, 16)
    };
    this.showTaskForm = true;
  }

  saveTask() {
    if (this.selectedTask) {
      const updatedTask: Task = {
        ...this.selectedTask,
        ...this.taskModel,
        updateDate: new Date().toISOString(),
        updateBy: 'current-user'
      } as Task;

      const index = this.tasks.findIndex(t => t.id === updatedTask.id);
      if (index !== -1) {
        this.tasks[index] = updatedTask;
      }
      this.taskUpdated.emit(updatedTask);
    } else {
      const newTask: Task = {
        ...this.taskModel,
        id: this.generateTaskId(),
        createDate: new Date().toISOString(),
        updateDate: new Date().toISOString(),
        leadId: this.leadId,
        createBy: 'current-user',
        updateBy: 'current-user'
      } as Task;

      this.tasks.push(newTask);
      this.taskUpdated.emit(newTask);
    }
    if (this.isPageMode) {
      this.updateStats();
    }
    this.closeTaskForm();
  }

  deleteTask(taskId: number) {
    if (confirm('Are you sure you want to delete this task?')) {
      this.tasks = this.tasks.filter(t => t.id !== taskId);
      this.taskUpdated.emit({ id: taskId } as Task);
      if (this.isPageMode) {
        this.updateStats();
        if (this.selectedTaskDetail?.id === taskId) this.selectedTaskDetail = null;
      }
    }
  }

  toggleTaskStatus(task: Task) {
    task.read = !task.read;
    task.status = task.read ? 'COMPLETED' : 'PENDING';
    task.updateDate = new Date().toISOString();
    task.updateBy = 'current-user';
    this.taskUpdated.emit(task);
    if (this.isPageMode) {
      this.updateStats();
    }
  }

  closeTaskForm() {
    this.showTaskForm = false;
    this.selectedTask = null;
    this.taskModel = {};
  }

  getUserName(userId: number | string): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.name : String(userId);
  }

  private generateTaskId(): number {
    return this.tasks.length > 0
      ? Math.max(...this.tasks.map(t => t.id)) + 1
      : 1;
  }

  getOwnerName(id: string | number): string {
    return this.getUserName(id);
  }
}
