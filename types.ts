// 看板列（申请状态）定义
export enum BoardColumn {
    WISHLIST = 'Wishlist',
    APPLIED = 'Applied',
    ASSESSMENT = 'Assessment',
    INTERVIEW = 'Interview',
    OUTCOME = 'Outcome'
  }
  
  // 单张求职卡片的核心数据结构
  export interface JobApplication {
    id: string;
    company: string;          // 公司名称
    role: string;             // 岗位名称 (如: 算法工程师, SDE)
    status: BoardColumn;      // 当前所处阶段
    resumeVersion?: string;   // 关联投递的简历版本
    deadline?: string;        // 关键截止日期 (如: OA 有效期)
    prepTags?: string[];      // 技术准备标签 (如: HashMap, QuickSort, DSP)
    interviewNotes?: string;  // 面试复盘 / 技术问题等多行笔记
  }