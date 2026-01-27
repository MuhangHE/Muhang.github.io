---
title: 'Home'
date: 2023-10-24
type: landing

sections:
  - block: resume-biography
    content:  
      # Note: `username` refers to the user's folder name in `content/authors/`
      # The user's folder name in content/authors/
      username: admin
    design:
      # banner:
      #   # Upload your cover image to the `assets/media/` folder and reference it here
      #   filename: kalen-emsley-Bkci_8qcdvQ-unsplash.jpg
      spacing:
        padding: [0, 0, 0, 0]
      biography:
        style: 'text-align: justify; font-size: 0.8em;'
    #这一个block用来添加横向按钮的
  # - block: cta-button-list
  #   content:  
  #     buttons:
  #       - text: Read my latest paper on LLMs
  #         icon: brands/arxiv
  #         url: https://arxiv.org/abs/2304.01852
  #   design:
  #     spacing:
  #       # Customize the section spacing. Order is top, right, bottom, left.
  #       padding: [0, 0, 0, 0]
  # - block: collection
  #   id: blog
  #   content:
  #     filters:
  #       folders:
  #         - blog
  #   design:
  #     spacing:
  #       # Customize the section spacing. Order is top, right, bottom, left.
  #       padding: [0, 0, 0, 0]
  # Experience/Education section hidden on home page
  # Education is shown on the dedicated /experiences page instead
  #隐藏stats
  # - block: stats
  #   content:
  #     title: "📊 My Statistics"
  #     items:
  #       - statistic: "100%"
  #         description: "Customer Satisfaction"
  #       - statistic: "24/7"
  #         description: "Support Availability"
  #       - statistic: "1M+"
  #         description: "Active Users"
  #   design:
  #     spacing:
  #       # Customize the section spacing. Order is top, right, bottom, left.
  #       padding: [0, 0, 0, 0]
  #       margin: [-100px, 0, 100px, 0]  # 减少顶部的间距
  # News section
  - block: markdown
    id: news
    content:
      title: Latest News
      text: |
        ### Started Ph.D. at Case Western Reserve University
        *August 26, 2024*

        Excited to begin my Ph.D. journey at Case Western Reserve University, working on Photoacoustics and Ultrasound imaging under the supervision of [Dr. Rui Cao](https://www.rui-pa.com/home).

        ---

        ### Graduated from Shanghai Jiao Tong University
        *June 30, 2024*

        Successfully completed my Bachelor's degree in Biomedical Engineering and received the Shanghai Outstanding Undergraduate Graduate award.
    design:
      columns: '1'
      spacing:
        padding: ['20px', 0, '20px', 0]

---
👋 Hey, I'm Muhang
