import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';


interface Stage {
    id: number;
    stage: string;
    parentId: number;
    type: string;
    action: string;
    color: string;
    templateId: string;
}

type ViewMode = 'grid' | 'list' | 'kanban';


@Component({
    selector: 'app-stages',
    imports: [CommonModule, FormsModule],
    templateUrl: './stages.html',
    styleUrl: './stages.css',
})

export class Stages {
    windowWidth = window.innerWidth;
    stages: Stage[] = [];
    selectedStage: Stage | null = null;
    isEditMode: boolean = false;
    searchTerm: string = '';
    filteredStages: Stage[] = [];
    currentView: ViewMode = 'grid'; // Renamed from viewMode to avoid conflict

    stageTypes = ['ActionandChangeStage', 'Action', 'Notification', 'Approval', 'Condition', 'Task', 'Email'];
    parentStages: { id: number; name: string }[] = [];

    stageModel: Stage = {
        id: 0,
        stage: '',
        parentId: 0,
        type: 'ActionandChangeStage',
        action: '',
        color: '#bcdb7b',
        templateId: ''
    };

    ngOnInit() {
        this.loadSampleStages();
        this.loadParentStages();
    }

    loadSampleStages() {
        this.stages = [
            {
                id: 1,
                stage: "Lead Generation",
                parentId: 0,
                type: "Action",
                action: "Create Lead|Assign Owner",
                color: "#ff6b6b",
                templateId: "1001"
            },
            {
                id: 2,
                stage: "Qualification",
                parentId: 1,
                type: "Condition",
                action: "Check Budget|Verify Authority",
                color: "#4ecdc4",
                templateId: "1022"
            },
            {
                id: 3,
                stage: "Needs Analysis",
                parentId: 1,
                type: "Task",
                action: "Schedule Call|Send Questionnaire",
                color: "#45b7d1",
                templateId: "1088"
            },
            {
                id: 4,
                stage: "Proposal",
                parentId: 1,
                type: "Action",
                action: "Create Proposal|Send for Review",
                color: "#96ceb4",
                templateId: "1156"
            },
            {
                id: 5,
                stage: "Conversation",
                parentId: 1,
                type: "ActionandChangeStage",
                action: "Log Event|Mention Reason",
                color: "#bcdb7b",
                templateId: "1344"
            },
            {
                id: 6,
                stage: "Negotiation",
                parentId: 1,
                type: "Approval",
                action: "Price Discussion|Terms Review",
                color: "#ffb347",
                templateId: "1421"
            },
            {
                id: 7,
                stage: "Closed Won",
                parentId: 1,
                type: "Action",
                action: "Send Contract|Welcome Email",
                color: "#6c5ce7",
                templateId: "1567"
            },
            {
                id: 8,
                stage: "Closed Lost",
                parentId: 1,
                type: "Notification",
                action: "Send Feedback|Archive",
                color: "#a8a8a8",
                templateId: "1678"
            }
        ];
        this.filteredStages = [...this.stages];
        this.selectedStage = this.stages[0];
    }

    loadParentStages() {
        this.parentStages = this.stages.map(stage => ({
            id: stage.id,
            name: stage.stage
        }));
        this.parentStages.unshift({ id: 0, name: 'No Parent (Root Level)' });
    }

    filterStages() {
        if (!this.searchTerm) {
            this.filteredStages = [...this.stages];
        } else {
            const term = this.searchTerm.toLowerCase();
            this.filteredStages = this.stages.filter(stage =>
                stage.stage.toLowerCase().includes(term) ||
                stage.type.toLowerCase().includes(term) ||
                stage.action.toLowerCase().includes(term) ||
                stage.templateId.includes(term)
            );
        }
    }

    selectStage(stage: Stage) {
        this.selectedStage = stage;
    }

    addStage() {
        this.isEditMode = true;
        this.selectedStage = null;
        this.resetForm();
    }

    editStage(stage: Stage) {
        this.isEditMode = true;
        this.selectedStage = stage;
        this.stageModel = { ...stage };
    }

    deleteStage(id: number) {
        if (confirm('Are you sure you want to delete this stage?')) {
            const index = this.stages.findIndex(s => s.id === id);
            if (index !== -1) {
                this.stages.splice(index, 1);
                if (this.selectedStage?.id === id) {
                    this.selectedStage = this.stages.length > 0 ? this.stages[0] : null;
                }
                this.filterStages();
                this.loadParentStages();
            }
        }
    }

    resetForm() {
        this.stageModel = {
            id: Math.max(...this.stages.map(s => s.id), 0) + 1,
            stage: '',
            parentId: 0,
            type: 'ActionandChangeStage',
            action: '',
            color: this.getRandomColor(),
            templateId: ''
        };
    }

    getRandomColor(): string {
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#bcdb7b', '#ffb347', '#6c5ce7', '#a8a8a8'];
        return colors[Math.floor(Math.random() * colors.length)];
    }


    // Add resize listener
    @HostListener('window:resize')
    onResize() {
        this.windowWidth = window.innerWidth;
    }

    onSubmit() {
        if (this.selectedStage) {
            const index = this.stages.findIndex(s => s.id === this.selectedStage!.id);
            if (index !== -1) {
                this.stages[index] = { ...this.stageModel };
            }
        } else {
            this.stages.push({ ...this.stageModel });
        }

        this.isEditMode = false;
        this.selectedStage = this.stages[this.stages.length - 1];
        this.filterStages();
        this.loadParentStages();
    }

    cancelEdit() {
        this.isEditMode = false;
        this.selectedStage = this.stages.length > 0 ? this.stages[0] : null;
    }

    getStagesByParent(parentId: number): Stage[] {
        return this.stages.filter(s => s.parentId === parentId);
    }

    getParentName(parentId: number): string {
        if (parentId === 0) return 'Root Level';
        const parent = this.stages.find(s => s.id === parentId);
        return parent ? parent.stage : 'Unknown';
    }

    getTypeIcon(type: string): string {
        const icons: { [key: string]: string } = {
            'ActionandChangeStage': 'bi-arrow-left-right',
            'Action': 'bi-lightning',
            'Notification': 'bi-bell',
            'Approval': 'bi-check2-circle',
            'Condition': 'bi-diagram-3',
            'Task': 'bi-check2-square',
            'Email': 'bi-envelope'
        };
        return icons[type] || 'bi-question-circle';
    }

    setView(mode: ViewMode) {
        this.currentView = mode;
    }

    getStageLevel(stage: Stage): number {
        let level = 0;
        let currentStage = stage;
        while (currentStage.parentId !== 0) {
            level++;
            const parent = this.stages.find(s => s.id === currentStage.parentId);
            if (!parent) break;
            currentStage = parent;
        }
        return level;
    }

    getStagesByLevel(level: number): Stage[] {
        return this.stages.filter(s => this.getStageLevel(s) === level);
    }

    getActionList(action: string): string[] {
        return action.split('|');
    }
}
